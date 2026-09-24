// Advanced SQL: solving real billing problems on the Healthcare Billing database.
Lessons.add([
  // ---------------------------------------------------------------- 01
  {
    id: 'advanced-01',
    goals: [
      'Understand how a recursive CTE has an anchor part and a recursive part',
      'Walk the practitioner supervisor tree from the top boss down',
      'Generate rows that do not exist yet, such as a calendar of months',
      'Know how the recursion stops and how to guard against infinite loops',
    ],
    concept: `<p>A <b>recursive query</b> is a query that uses its own output as input, again and again, until it produces no new rows.</p>
<p>In SQL you write it as <code>WITH RECURSIVE name AS (anchor UNION ALL recursive-step)</code>:</p>
<ul>
<li>The <b>anchor</b> runs once. It gives the starting rows (for example, the top boss, practitioner 1).</li>
<li>The <b>recursive step</b> joins the table to the rows produced by the <i>previous round</i> (for example, "people whose supervisor is someone we just found").</li>
<li>Rounds repeat until a round returns zero rows. All rounds are glued together with <code>UNION ALL</code>.</li>
</ul>
<p>Two classic uses in billing: walking a <b>hierarchy</b> (who reports to whom) and <b>generating series</b> (every month from 2025-01 to 2026-09, even months with no invoices).</p>`,
    why: 'Plain SQL joins go a fixed number of levels deep. Recursion lets one query follow a chain of any length, such as a reporting line or a sequence of dates.',
    when: 'Use it for trees (org charts, referral chains), graphs, and to generate numbers or dates that are not stored in any table.',
    analogy: 'Think of a phone tree in a clinic: the medical director calls her direct reports, each of them calls their own reports, and so on until nobody is left to call. Each round of calls is one recursion step.',
    exampleSql: `SELECT practitioner_id, first_name, last_name, supervisor_id FROM practitioners ORDER BY practitioner_id`,
    syntax: `WITH RECURSIVE cte (col1, col2, level) AS (
  SELECT ..., 0            -- anchor: the starting rows
  FROM table
  WHERE <start condition>
  UNION ALL
  SELECT ..., cte.level + 1 -- recursive step: join to the previous round
  FROM table
  JOIN cte ON table.parent_id = cte.id
)
SELECT * FROM cte;`,
    sql: `WITH RECURSIVE org (practitioner_id, name, supervisor_id, level, path) AS (
  SELECT practitioner_id, first_name || ' ' || last_name, supervisor_id, 0, last_name
  FROM practitioners
  WHERE supervisor_id IS NULL
  UNION ALL
  SELECT p.practitioner_id, p.first_name || ' ' || p.last_name, p.supervisor_id,
         o.level + 1, o.path || ' > ' || p.last_name
  FROM practitioners p
  JOIN org o ON p.supervisor_id = o.practitioner_id
)
SELECT practitioner_id, name, level, path
FROM org
ORDER BY path;`,
    breakdown: [
      ['WITH RECURSIVE org (...)', 'Declares a CTE named org that is allowed to refer to itself.'],
      ['SELECT ... WHERE supervisor_id IS NULL', 'Anchor: the top of the tree, Elena Ramirez (id 1), at level 0.'],
      ['UNION ALL', 'Adds each new round of rows to the result.'],
      ['JOIN org o ON p.supervisor_id = o.practitioner_id', 'Recursive step: find everyone whose supervisor was found in the previous round.'],
      ['o.level + 1, o.path || \' > \' || p.last_name', 'Each round goes one level deeper and extends the breadcrumb path.'],
      ['ORDER BY path', 'Sorting by the path lists each manager directly above their team.'],
    ],
    visual: { type: 'recursive' },
    internals: `<p>SQLite keeps a <b>queue</b> of rows. It runs the anchor, puts the rows in the queue, then repeatedly takes one row out, runs the recursive SELECT with only that row as <code>org</code>, and puts the new rows back in the queue. When the queue is empty, it stops.</p>
<p>That is why the recursive part may only reference the CTE once and may not use aggregates on it: it only ever sees the "current" row(s), not the whole result so far.</p>`,
    mistakes: [
      { wrong: `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n)
SELECT x FROM n;`, why: 'There is no stop condition, so the recursion never ends (the app will hang or hit a limit).', fix: `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x < 10)
SELECT x FROM n;` },
      { wrong: `WITH RECURSIVE org AS (
  SELECT practitioner_id, supervisor_id FROM practitioners WHERE supervisor_id IS NULL
  UNION ALL
  SELECT p.practitioner_id, p.supervisor_id FROM practitioners p JOIN org o ON o.supervisor_id = p.practitioner_id
) SELECT * FROM org;`, why: 'The join is backwards. Starting from the top boss, o.supervisor_id is NULL, so nothing is found. To go DOWN the tree, match the child\'s supervisor_id to the parent\'s id.', fix: `WITH RECURSIVE org AS (
  SELECT practitioner_id, supervisor_id FROM practitioners WHERE supervisor_id IS NULL
  UNION ALL
  SELECT p.practitioner_id, p.supervisor_id FROM practitioners p JOIN org o ON p.supervisor_id = o.practitioner_id
) SELECT * FROM org;` },
    ],
    rules: [
      'Anchor first, then UNION ALL, then the recursive step.',
      'The recursive step must eventually return zero rows: always have a stop condition.',
      'Carry a level or path column: it makes the output readable and helps you stop loops.',
      'Use UNION (not UNION ALL) only if you want duplicates removed to break cycles.',
    ],
    compare: `<table><tr><th>Approach</th><th>Depth</th><th>Notes</th></tr>
<tr><td>Self-join</td><td>Fixed (one join per level)</td><td>Simple but breaks when the tree grows deeper</td></tr>
<tr><td>Recursive CTE</td><td>Any</td><td>Standard SQL, works in SQLite, Postgres, SQL Server, MySQL 8, Oracle</td></tr>
<tr><td>Oracle CONNECT BY</td><td>Any</td><td>Older Oracle-only syntax for the same idea</td></tr></table>`,
    realWorld: 'Billing systems use recursion to roll up revenue through an org chart, expand bundled procedure codes into their parts, and build calendar tables for monthly reports that must show zero months.',
    tips: ['Test the anchor on its own first. If the anchor is wrong, every round is wrong.'],
    deep: `<p>SQLite accepts <code>ORDER BY</code> and <code>LIMIT</code> inside a recursive CTE. With <code>ORDER BY level</code> the queue behaves like breadth-first search; with <code>ORDER BY level DESC</code> it becomes depth-first. <code>LIMIT</code> inside the CTE is a handy safety net: <code>... LIMIT 1000</code>.</p>
<p>SQL Server caps recursion at 100 levels by default (<code>OPTION (MAXRECURSION n)</code>). Postgres 14+ adds <code>SEARCH DEPTH FIRST BY</code> and <code>CYCLE ... SET is_cycle</code> clauses.</p>`,
    tryIt: {
      prompt: 'Generate a calendar of the first day of every month from 2026-01-01 to 2026-09-01. Then try changing +1 month to +7 days.',
      starter: `WITH RECURSIVE months(m) AS (
  SELECT '2026-01-01'
  UNION ALL
  SELECT date(m, '+1 month') FROM months WHERE m < '2026-09-01'
)
SELECT m FROM months;`,
    },
    challenge: {
      level: 3,
      prompt: 'Build a monthly invoice count for every month from 2025-01 through 2026-09, including months with zero invoices. Return month as YYYY-MM and the number of invoices, in month order.',
      solution: `WITH RECURSIVE months(m) AS (
  SELECT '2025-01-01'
  UNION ALL
  SELECT date(m, '+1 month') FROM months WHERE m < '2026-09-01'
)
SELECT strftime('%Y-%m', m) AS month, COUNT(i.invoice_id) AS invoices
FROM months
LEFT JOIN invoices i ON strftime('%Y-%m', i.invoice_date) = strftime('%Y-%m', m)
GROUP BY m
ORDER BY m;`,
      hints: [
        'Months with no invoices do not exist in any table, so you have to generate them.',
        'A recursive CTE can start at \'2025-01-01\' and add one month per round with date(m, \'+1 month\').',
        'LEFT JOIN invoices to the calendar on strftime(\'%Y-%m\', ...) so empty months survive.',
        'COUNT(i.invoice_id) (not COUNT(*)) returns 0 for months with no match. GROUP BY m and ORDER BY m.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What makes a recursive CTE stop?', options: ['It always stops after 100 rounds', 'A round returns zero new rows', 'The anchor returns zero rows', 'UNION ALL removes duplicates'], answer: 1, why: 'Each round feeds the next. When a round finds nothing new, there is nothing to feed forward and the recursion ends.' },
      { q: 'In the org query, which rows does the recursive step join to?', options: ['All rows in the result so far', 'Only the rows produced by the previous round', 'Only the anchor rows', 'The whole practitioners table twice'], answer: 1, why: 'The CTE name inside the recursive step refers to the rows from the previous round (the working queue), not the whole result.' },
    ],
  },

  // ---------------------------------------------------------------- 02
  {
    id: 'advanced-02',
    goals: [
      'Model a tree with a parent id column (adjacency list)',
      'Walk up a hierarchy to find all ancestors of one person',
      'Roll up values (charges) from every descendant to each manager',
      'Compare adjacency lists with path strings and nested sets',
    ],
    concept: `<p><b>Hierarchical data</b> is data where each row has a parent: practitioners have a <code>supervisor_id</code> that points to another practitioner. This design is called an <b>adjacency list</b>.</p>
<p>Three questions come up again and again:</p>
<ul>
<li><b>Down</b>: who is in this manager's whole team (direct and indirect reports)?</li>
<li><b>Up</b>: what is the chain of command above this person?</li>
<li><b>Roll-up</b>: how much did each manager's whole team bill?</li>
</ul>
<p>All three are recursive CTEs. The trick for roll-ups is to remember the <b>root</b> you started from in a column, so every descendant row still knows which manager it belongs to.</p>`,
    why: 'Real organizations, charts of accounts and procedure bundles are trees. Reports often need totals per branch, not just per row.',
    when: 'Use it when a table references itself (supervisor_id, parent_account_id, parent_code) and you need to answer questions across several levels.',
    analogy: 'A clinic org chart on the wall: to know how big Dr. Okafor\'s department is, you point at her box and count every box hanging below it, however many layers down.',
    exampleSql: `SELECT practitioner_id, first_name || ' ' || last_name AS name, specialty, supervisor_id FROM practitioners ORDER BY supervisor_id, practitioner_id`,
    syntax: `WITH RECURSIVE team(root_id, member_id) AS (
  SELECT id, id FROM people              -- every person is the root of their own subtree
  UNION ALL
  SELECT t.root_id, p.id
  FROM people p JOIN team t ON p.parent_id = t.member_id
)
SELECT root_id, COUNT(*) - 1 AS reports FROM team GROUP BY root_id;`,
    sql: `WITH RECURSIVE team(root_id, member_id) AS (
  SELECT practitioner_id, practitioner_id FROM practitioners
  UNION ALL
  SELECT t.root_id, p.practitioner_id
  FROM practitioners p
  JOIN team t ON p.supervisor_id = t.member_id
)
SELECT pr.practitioner_id,
       pr.first_name || ' ' || pr.last_name AS manager,
       COUNT(DISTINCT t.member_id) - 1       AS team_size,
       COALESCE(SUM(c.amount), 0)            AS team_billed
FROM team t
JOIN practitioners pr ON pr.practitioner_id = t.root_id
LEFT JOIN charges c   ON c.practitioner_id = t.member_id
GROUP BY pr.practitioner_id
ORDER BY team_billed DESC;`,
    breakdown: [
      ['SELECT practitioner_id, practitioner_id FROM practitioners', 'Anchor: every practitioner starts a subtree containing just themselves.'],
      ['SELECT t.root_id, p.practitioner_id ... JOIN team t ON p.supervisor_id = t.member_id', 'Recursive step: add the reports of every member found so far, keeping the original root_id.'],
      ['COUNT(DISTINCT t.member_id) - 1', 'Team size, not counting the manager themselves.'],
      ['LEFT JOIN charges c ON c.practitioner_id = t.member_id', 'Attach every charge of every team member (LEFT keeps members with no charges, like Leo Martins).'],
      ['COALESCE(SUM(c.amount), 0)', 'Roll-up: total billed by the whole subtree.'],
    ],
    visual: { type: 'recursive' },
    internals: `<p>Starting from every row (not just the root) makes the CTE produce one row per <i>(ancestor, descendant)</i> pair. This is called the <b>transitive closure</b>. For 12 practitioners in a 4-level tree it is small, but on huge trees it can explode, so large systems often store the closure in a table and maintain it with triggers.</p>`,
    mistakes: [
      { wrong: `SELECT p.practitioner_id, COUNT(r.practitioner_id) AS team_size
FROM practitioners p LEFT JOIN practitioners r ON r.supervisor_id = p.practitioner_id
GROUP BY p.practitioner_id;`, why: 'A self-join only counts direct reports. Elena (id 1) looks like she has 4 people, but her whole organization is 11.', fix: `WITH RECURSIVE team(root_id, member_id) AS (
  SELECT practitioner_id, practitioner_id FROM practitioners
  UNION ALL
  SELECT t.root_id, p.practitioner_id FROM practitioners p JOIN team t ON p.supervisor_id = t.member_id
)
SELECT root_id, COUNT(*) - 1 AS team_size FROM team GROUP BY root_id;` },
    ],
    rules: [
      'Going down: child.parent_id = cte.id. Going up: parent.id = cte.parent_id.',
      'Carry the root id through the recursion when you need per-branch totals.',
      'Join facts (charges) AFTER the recursion, not inside it.',
    ],
    compare: `<table><tr><th>Model</th><th>Read subtree</th><th>Move a node</th></tr>
<tr><td>Adjacency list (supervisor_id)</td><td>Recursive CTE</td><td>Update one row</td></tr>
<tr><td>Materialized path ('1/2/5/6')</td><td>LIKE '1/2/%'</td><td>Rewrite all descendants' paths</td></tr>
<tr><td>Nested sets (lft, rgt)</td><td>BETWEEN lft AND rgt</td><td>Renumber much of the table</td></tr>
<tr><td>Closure table</td><td>Simple join</td><td>Insert/delete many pairs</td></tr></table>`,
    realWorld: 'Healthcare groups roll up productivity by department head, finance teams roll up general-ledger accounts into parent accounts, and claim systems walk parent/child claim adjustments.',
    deep: `<p>SQL Server has a native <code>hierarchyid</code> type with methods like <code>GetAncestor()</code> and <code>IsDescendantOf()</code>. Postgres has the <code>ltree</code> extension (<code>path &lt;@ '1.2'</code>). Both are materialized-path designs with index support.</p>`,
    tryIt: {
      prompt: 'Walk UP the tree: list the chain of command above Grace Liu (practitioner 11). Try another id, such as 6.',
      starter: `WITH RECURSIVE chain(practitioner_id, supervisor_id, steps_up) AS (
  SELECT practitioner_id, supervisor_id, 0 FROM practitioners WHERE practitioner_id = 11
  UNION ALL
  SELECT p.practitioner_id, p.supervisor_id, c.steps_up + 1
  FROM practitioners p JOIN chain c ON p.practitioner_id = c.supervisor_id
)
SELECT c.steps_up, p.first_name || ' ' || p.last_name AS name, p.specialty
FROM chain c JOIN practitioners p USING (practitioner_id)
ORDER BY c.steps_up;`,
    },
    challenge: {
      level: 3,
      prompt: 'For every practitioner who manages at least one person, return practitioner_id, full name (first last) and the number of direct AND indirect reports. Sort by report count descending, then practitioner_id.',
      solution: `WITH RECURSIVE team(root_id, member_id) AS (
  SELECT practitioner_id, practitioner_id FROM practitioners
  UNION ALL
  SELECT t.root_id, p.practitioner_id
  FROM practitioners p JOIN team t ON p.supervisor_id = t.member_id
)
SELECT pr.practitioner_id, pr.first_name || ' ' || pr.last_name AS name, COUNT(*) - 1 AS reports
FROM team t JOIN practitioners pr ON pr.practitioner_id = t.root_id
GROUP BY pr.practitioner_id
HAVING COUNT(*) > 1
ORDER BY reports DESC, pr.practitioner_id;`,
      hints: [
        'A self-join only finds direct reports; you need recursion.',
        'Start the recursion from EVERY practitioner, carrying their id as root_id.',
        'In the recursive step, keep root_id and add practitioners whose supervisor_id equals the current member.',
        'GROUP BY root_id, subtract 1 for the person themselves, and keep groups with HAVING COUNT(*) > 1.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Which join condition walks DOWN a supervisor tree?', options: ['p.practitioner_id = cte.supervisor_id', 'p.supervisor_id = cte.practitioner_id', 'p.supervisor_id = cte.supervisor_id', 'p.practitioner_id = cte.practitioner_id'], answer: 1, why: 'Children are the rows whose supervisor_id points at someone already in the CTE.' },
      { q: 'Why carry a root_id column in a roll-up CTE?', options: ['To make the query faster', 'So each descendant row remembers which manager\'s subtree it belongs to', 'Because UNION ALL requires it', 'To remove duplicates'], answer: 1, why: 'After recursion you GROUP BY root_id to total each branch.' },
    ],
  },

  // ---------------------------------------------------------------- 03
  {
    id: 'advanced-03',
    goals: [
      'See relational data as a graph of nodes and edges',
      'Derive edges: practitioners who treated the same patient',
      'Find degrees of separation with a recursive breadth-first walk',
      'Prevent infinite loops in graphs that contain cycles',
    ],
    concept: `<p>A tree has one parent per node. A <b>graph</b> is looser: any node can connect to any other, and paths can loop back (cycles).</p>
<p>Our billing data hides a graph. Treat each <b>practitioner as a node</b>. Draw an <b>edge</b> between two practitioners when they have billed charges for the same patient. That is a "care team" network.</p>
<p>With the edges in a CTE, a recursive query can walk the network: "who is 1 step, 2 steps, 3 steps away from Dr. Bello?" Because the graph has cycles (A knows B, B knows A), we must remember the <b>path</b> we walked and refuse to revisit a node.</p>`,
    why: 'Referral networks, shared-patient analysis, fraud rings and provider networks are graphs. SQL can answer path questions without a separate graph database.',
    when: 'Use it for "how are these connected?" questions: shared patients, referral chains, linked accounts, duplicate-identity clusters.',
    analogy: 'Six degrees of separation in a hospital: a psychiatrist has never met a radiologist, but both treated a patient who was also seen by a family doctor, so they are two steps apart.',
    exampleSql: `SELECT i.patient_id, c.practitioner_id, COUNT(*) AS charges
FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id
WHERE i.patient_id IN (3, 7)
GROUP BY i.patient_id, c.practitioner_id`,
    syntax: `WITH RECURSIVE edges(a, b) AS (...),
walk(node, hops, path) AS (
  SELECT :start, 0, ',' || :start || ','
  UNION ALL
  SELECT e.b, w.hops + 1, w.path || e.b || ','
  FROM walk w JOIN edges e ON e.a = w.node
  WHERE instr(w.path, ',' || e.b || ',') = 0   -- no revisits
    AND w.hops < :max_hops
)
SELECT node, MIN(hops) FROM walk GROUP BY node;`,
    sql: `WITH care AS (
  SELECT DISTINCT i.patient_id, c.practitioner_id
  FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id
)
SELECT a.practitioner_id AS practitioner_a,
       b.practitioner_id AS practitioner_b,
       COUNT(*)          AS shared_patients
FROM care a
JOIN care b ON a.patient_id = b.patient_id
           AND a.practitioner_id < b.practitioner_id
GROUP BY a.practitioner_id, b.practitioner_id
ORDER BY shared_patients DESC, practitioner_a, practitioner_b
LIMIT 10;`,
    breakdown: [
      ['WITH care AS (SELECT DISTINCT patient_id, practitioner_id ...)', 'One row per (patient, practitioner) who billed for them.'],
      ['JOIN care b ON a.patient_id = b.patient_id', 'Pair up practitioners who share a patient.'],
      ['AND a.practitioner_id < b.practitioner_id', 'Keep each pair once (A-B, not also B-A) and drop self-pairs.'],
      ['COUNT(*) AS shared_patients', 'Edge weight: how many patients the two share.'],
    ],
    visual: { type: 'flow', steps: [['charges + invoices', '104 charge rows'], ['DISTINCT (patient, practitioner)', 'care links'], ['self-join on patient_id', 'practitioner pairs = edges'], ['recursive walk from a start node', 'paths, no revisits'], ['MIN(hops) per node', 'degrees of separation']] },
    internals: `<p>The walk is a breadth-first search that SQLite runs through its recursion queue. The <code>path</code> string is the "visited" set. Without it, A → B → A → B ... never ends. The <code>hops &lt; 3</code> limit caps the work: the number of paths can grow very fast in dense graphs.</p>`,
    mistakes: [
      { wrong: `WITH RECURSIVE edges(a, b) AS (SELECT 1, 2 UNION ALL SELECT 2, 1),
walk(node) AS (SELECT 1 UNION ALL SELECT e.b FROM walk w JOIN edges e ON e.a = w.node)
SELECT * FROM walk LIMIT 20;`, why: 'The graph has a cycle (1 → 2 → 1). Without a visited check the walk loops forever; only LIMIT saves it here.', fix: `WITH RECURSIVE edges(a, b) AS (SELECT 1, 2 UNION ALL SELECT 2, 1),
walk(node, path) AS (SELECT 1, ',1,' UNION ALL
  SELECT e.b, w.path || e.b || ',' FROM walk w JOIN edges e ON e.a = w.node
  WHERE instr(w.path, ',' || e.b || ',') = 0)
SELECT * FROM walk;` },
    ],
    rules: [
      'Graphs have cycles: always track visited nodes or a max depth.',
      'Store edges in both directions (or UNION them) when the relationship is mutual.',
      'Use MIN(hops) per node to get the shortest distance.',
      'Wrap ids in delimiters (,7,) so instr() does not confuse 1 with 11.',
    ],
    compare: `<table><tr><th></th><th>Tree</th><th>Graph</th></tr>
<tr><td>Parents per node</td><td>One</td><td>Any number</td></tr>
<tr><td>Cycles</td><td>No</td><td>Possible</td></tr>
<tr><td>Guard needed</td><td>Usually none</td><td>Visited path or depth limit</td></tr>
<tr><td>Tools</td><td>Recursive CTE</td><td>Recursive CTE, or a graph DB (Neo4j), SQL Server graph tables, Postgres pgRouting</td></tr></table>`,
    realWorld: 'Payment-integrity teams look for clusters of providers sharing unusual numbers of patients, networks build referral graphs, and identity resolution links records through shared phones or emails.',
    deep: `<p>Postgres 14 adds <code>CYCLE practitioner_id SET is_cycle USING path</code>, which does the visited-path bookkeeping for you. SQL Server 2017+ has <code>NODE</code>/<code>EDGE</code> tables and <code>MATCH(SHORTEST_PATH(...))</code>.</p>`,
    tryIt: {
      prompt: 'List the practitioners Aisha Bello (id 7) shares at least one patient with. Change 7 to 12: why is the result empty?',
      starter: `WITH care AS (
  SELECT DISTINCT i.patient_id, c.practitioner_id
  FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id
)
SELECT DISTINCT b.practitioner_id
FROM care a JOIN care b ON a.patient_id = b.patient_id AND b.practitioner_id <> a.practitioner_id
WHERE a.practitioner_id = 7
ORDER BY 1;`,
    },
    challenge: {
      level: 4,
      prompt: 'Degrees of separation: starting from practitioner 7, find the shortest number of hops (through shared patients, max 3 hops) to every other reachable practitioner. Return practitioner_id and hops, sorted by hops then practitioner_id.',
      solution: `WITH RECURSIVE care AS (
  SELECT DISTINCT i.patient_id, c.practitioner_id
  FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id
),
edges(a, b) AS (
  SELECT DISTINCT x.practitioner_id, y.practitioner_id
  FROM care x JOIN care y ON x.patient_id = y.patient_id AND x.practitioner_id <> y.practitioner_id
),
walk(node, hops, path) AS (
  SELECT 7, 0, ',7,'
  UNION ALL
  SELECT e.b, w.hops + 1, w.path || e.b || ','
  FROM walk w JOIN edges e ON e.a = w.node
  WHERE instr(w.path, ',' || e.b || ',') = 0 AND w.hops < 3
)
SELECT node AS practitioner_id, MIN(hops) AS hops
FROM walk
WHERE node <> 7
GROUP BY node
ORDER BY hops, practitioner_id;`,
      hints: [
        'First build care links (patient, practitioner), then edges (practitioner a, practitioner b) from a self-join on patient_id.',
        'The walk starts at node 7 with hops 0 and a path string \',7,\'.',
        'In the recursive step, follow edges where e.a = w.node, append e.b to the path, and skip nodes already in the path with instr().',
        'Stop at hops < 3, then GROUP BY node and take MIN(hops). Exclude node 7 itself.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why does a graph walk need a visited path or depth limit?', options: ['Graphs are always huge', 'Cycles would make the recursion revisit nodes forever', 'SQLite requires it syntactically', 'To sort the output'], answer: 1, why: 'If A links to B and B links to A, the walk would bounce between them without end.' },
      { q: 'Why wrap ids in commas like \',7,\' before using instr()?', options: ['Commas are faster', 'So searching for 1 does not match inside 11 or 12', 'instr() needs commas', 'To make the path sortable'], answer: 1, why: 'instr(\'11\', \'1\') is true; instr(\',11,\', \',1,\') is false.' },
    ],
  },

  // ---------------------------------------------------------------- 04
  {
    id: 'advanced-04',
    goals: [
      'Build JSON documents with json_object and json_group_array',
      'Read values out of JSON with json_extract and the ->> operator',
      'Turn a JSON array back into rows with json_each',
      'Know how JSON support differs between databases',
    ],
    concept: `<p><b>JSON</b> is text that holds nested data: objects <code>{"key": value}</code> and arrays <code>[1, 2, 3]</code>. APIs, EHR integrations and claim clearinghouses send and receive it.</p>
<p>SQLite has built-in JSON functions:</p>
<ul>
<li><code>json_object('k', v, ...)</code> builds an object from one row.</li>
<li><code>json_group_array(x)</code> is an <b>aggregate</b>: it turns many rows into one JSON array.</li>
<li><code>json_extract(doc, '$.path')</code> (or <code>doc ->> '$.path'</code>) reads a value out.</li>
<li><code>json_each(doc, '$.array')</code> is a table-valued function that turns array elements into rows.</li>
</ul>
<p>Combine them and one query can produce a complete invoice document: header fields plus a nested list of charges.</p>`,
    why: 'Applications want nested documents, while SQL stores flat rows. JSON functions bridge the two directly in the database.',
    when: 'Use it to feed APIs and front ends, to store flexible attributes (payer-specific claim fields), or to read JSON that arrived from another system.',
    analogy: 'A paper invoice packet: one cover sheet (the object) with a stapled list of line items (the array). json_group_array is the stapler.',
    exampleSql: `SELECT invoice_id, charge_id, cpt_code, amount FROM charges WHERE invoice_id IN (4, 13) ORDER BY invoice_id, charge_id`,
    syntax: `SELECT json_object('id', t.id, 'items',
         (SELECT json_group_array(json_object('k', c.col)) FROM child c WHERE c.parent_id = t.id))
FROM parent t;

SELECT json_extract(doc, '$.items[0].k'), doc ->> '$.id'
FROM docs;`,
    sql: `SELECT json_object(
         'invoice_id', i.invoice_id,
         'status',     i.status,
         'total',      i.total_amount,
         'charges', (SELECT json_group_array(json_object('cpt', c.cpt_code, 'amount', c.amount))
                     FROM charges c WHERE c.invoice_id = i.invoice_id)
       ) AS invoice_json
FROM invoices i
WHERE i.invoice_id IN (4, 13);`,
    breakdown: [
      ['json_object(\'invoice_id\', i.invoice_id, ...)', 'Builds one JSON object per invoice from key/value pairs.'],
      ['(SELECT json_group_array(...) FROM charges c WHERE c.invoice_id = i.invoice_id)', 'Correlated subquery: collects this invoice\'s charges into a JSON array.'],
      ['json_object(\'cpt\', c.cpt_code, \'amount\', c.amount)', 'Each array element is itself an object.'],
      ['WHERE i.invoice_id IN (4, 13)', 'Two invoices so the output is easy to read.'],
    ],
    visual: { type: 'flow', steps: [['invoices row', 'header fields'], ['charges rows for that invoice', 'many rows'], ['json_object per charge', '{"cpt":..,"amount":..}'], ['json_group_array', '[ {...}, {...} ]'], ['json_object for the invoice', 'one nested document']] },
    internals: `<p>SQLite stores JSON as plain TEXT (or as the binary JSONB format with <code>jsonb()</code> in 3.45+). Every <code>json_extract</code> call parses the text, so extracting from large documents in a WHERE clause on many rows is slow. You can index an expression: <code>CREATE INDEX ix ON docs(json_extract(doc, '$.status'))</code>.</p>`,
    mistakes: [
      { wrong: `SELECT '{"total": ' || total_amount || '}' AS doc FROM invoices;`, why: 'Building JSON with string concatenation breaks on quotes, NULLs and special characters and produces invalid JSON.', fix: `SELECT json_object('total', total_amount) AS doc FROM invoices;` },
      { wrong: `SELECT json_extract('{"a":{"b":5}}', 'a.b');`, why: 'JSON paths must start with $.', fix: `SELECT json_extract('{"a":{"b":5}}', '$.a.b');` },
    ],
    rules: [
      'Build JSON with json_object/json_array, never with ||.',
      'Paths start with $: $.key, $.array[0], $.a.b.',
      '-> returns JSON; ->> returns a plain SQL value.',
      'json_each turns an array into rows (key, value, type ...).',
    ],
    compare: `<table><tr><th>Task</th><th>SQLite</th><th>PostgreSQL</th><th>SQL Server</th><th>MySQL</th></tr>
<tr><td>Build object</td><td>json_object</td><td>jsonb_build_object</td><td>FOR JSON PATH / JSON_OBJECT</td><td>JSON_OBJECT</td></tr>
<tr><td>Aggregate array</td><td>json_group_array</td><td>jsonb_agg</td><td>FOR JSON / JSON_ARRAYAGG</td><td>JSON_ARRAYAGG</td></tr>
<tr><td>Extract value</td><td>json_extract, ->></td><td>->>, #>></td><td>JSON_VALUE</td><td>JSON_EXTRACT, ->></td></tr>
<tr><td>Array to rows</td><td>json_each</td><td>jsonb_array_elements</td><td>OPENJSON</td><td>JSON_TABLE</td></tr></table>`,
    realWorld: 'FHIR healthcare APIs exchange JSON resources; billing systems return invoice detail to patient portals as JSON and store payer-specific claim attributes in a JSON column.',
    deep: `<p>In Postgres, prefer <code>jsonb</code> (binary, indexable with GIN: <code>WHERE doc @&gt; '{"status":"Paid"}'</code>). In SQLite, <code>json_group_array</code> has no ORDER BY argument, so order the rows in a subquery first if the array order matters.</p>`,
    tryIt: {
      prompt: 'Read fields back out of the JSON: status, how many charges, and the first CPT code. Try $.charges[1].amount too.',
      starter: `WITH docs AS (
  SELECT i.invoice_id, json_object('status', i.status,
    'charges', (SELECT json_group_array(json_object('cpt', c.cpt_code, 'amount', c.amount))
                FROM charges c WHERE c.invoice_id = i.invoice_id)) AS doc
  FROM invoices i WHERE i.invoice_id IN (4, 13, 27)
)
SELECT invoice_id,
       doc ->> '$.status' AS status,
       json_array_length(doc, '$.charges') AS n_charges,
       json_extract(doc, '$.charges[0].cpt') AS first_cpt
FROM docs;`,
    },
    challenge: {
      level: 3,
      prompt: 'In a CTE, store each invoice as a JSON document with keys status, total and n_charges (its number of charges). Then, reading ONLY from the JSON, return invoice_id, status and n_charges for documents whose total is at least 500, ordered by invoice_id.',
      solution: `WITH docs AS (
  SELECT i.invoice_id,
         json_object('status', i.status, 'total', i.total_amount,
                     'n_charges', (SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id)) AS doc
  FROM invoices i
)
SELECT invoice_id, json_extract(doc, '$.status') AS status, json_extract(doc, '$.n_charges') AS n_charges
FROM docs
WHERE json_extract(doc, '$.total') >= 500
ORDER BY invoice_id;`,
      hints: [
        'Use json_object(\'status\', ..., \'total\', ..., \'n_charges\', ...) inside a CTE.',
        'n_charges can be a correlated subquery: (SELECT COUNT(*) FROM charges c WHERE c.invoice_id = i.invoice_id).',
        'In the outer query use json_extract(doc, \'$.total\') >= 500 to filter.',
        'Select json_extract(doc, \'$.status\') and json_extract(doc, \'$.n_charges\'), ORDER BY invoice_id.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Which function turns many rows into one JSON array?', options: ['json_object', 'json_extract', 'json_group_array', 'json_each'], answer: 2, why: 'json_group_array is an aggregate function, like SUM but producing an array.' },
      { q: 'What is the difference between -> and ->> in SQLite?', options: ['None', '-> returns JSON text, ->> returns a plain SQL value', '->> is faster', '-> only works on arrays'], answer: 1, why: '\'"Paid"\' (JSON string, with quotes) vs Paid (SQL text).' },
      { q: 'Which function turns a JSON array into rows?', options: ['json_each', 'json_group_array', 'json_array', 'json_valid'], answer: 0, why: 'json_each is table-valued: use it in FROM.' },
    ],
  },

  // ---------------------------------------------------------------- 05
  {
    id: 'advanced-05',
    goals: [
      'Know that SQLite has no ARRAY type, and what to use instead',
      'Split a comma-separated column (allergies) into one row per value',
      'Collect rows into a list with group_concat or json_group_array',
      'Compare with native arrays in PostgreSQL',
    ],
    concept: `<p>An <b>array</b> is a list of values stored in one cell. PostgreSQL has real arrays (<code>TEXT[]</code>). SQLite does not, so data often arrives as a comma-separated string, like <code>patients.allergies = 'Penicillin, Latex'</code>.</p>
<p>Two moves cover most needs:</p>
<ul>
<li><b>Explode</b> (list → rows): turn the string into a JSON array, then use <code>json_each</code> to get one row per element.</li>
<li><b>Collapse</b> (rows → list): <code>group_concat(x, ', ')</code> or <code>json_group_array(x)</code>.</li>
</ul>
<p>Once exploded, each allergy is a normal row: you can count, filter and join it.</p>`,
    why: 'Lists hidden in one column cannot be filtered, counted or joined reliably. Exploding them gives you proper rows; collapsing gives readable lists for reports.',
    when: 'Use it when importing messy data (tags, allergy lists, modifier codes) or when a report needs "all CPT codes on this invoice" in one cell.',
    analogy: 'A patient intake form with "Allergies: Penicillin, Latex" scribbled on one line. To alert the pharmacy, a nurse copies each allergy onto its own index card.',
    exampleSql: `SELECT patient_id, first_name, last_name, allergies FROM patients WHERE allergies IS NOT NULL`,
    syntax: `-- explode
SELECT t.id, trim(j.value) AS item
FROM t, json_each('["' || replace(t.list_col, ',', '","') || '"]') AS j;

-- collapse
SELECT id, group_concat(item, ', ') FROM t GROUP BY id;`,
    sql: `SELECT p.patient_id,
       p.first_name || ' ' || p.last_name AS patient,
       trim(j.value) AS allergy
FROM patients p,
     json_each('["' || replace(p.allergies, ',', '","') || '"]') AS j
WHERE p.allergies IS NOT NULL
ORDER BY allergy, p.patient_id;`,
    breakdown: [
      ['replace(p.allergies, \',\', \'","\')', 'Turns Penicillin, Latex into Penicillin"," Latex.'],
      ['\'["\' || ... || \'"]\'', 'Wraps it into a JSON array: ["Penicillin"," Latex"].'],
      ['json_each(...) AS j', 'Table-valued function: one row per array element, value in j.value.'],
      ['FROM patients p, json_each(...)', 'The comma join runs json_each once per patient (like a LATERAL join).'],
      ['trim(j.value)', 'Removes the leading space left after the comma.'],
    ],
    visual: { type: 'flow', steps: [['patients.allergies', '\'Penicillin, Latex\''], ['replace + wrap', '["Penicillin"," Latex"]'], ['json_each', '2 rows'], ['trim(value)', 'Penicillin | Latex']] },
    internals: `<p><code>json_each</code> is a virtual table. When it appears after another table in FROM and references its columns, SQLite evaluates it once per outer row, which is exactly what PostgreSQL calls a LATERAL join and SQL Server calls CROSS APPLY.</p>`,
    mistakes: [
      { wrong: `SELECT COUNT(*) FROM patients WHERE allergies = 'Penicillin';`, why: 'Equality misses patients whose list is \'Penicillin, Latex\'.', fix: `SELECT COUNT(*) FROM patients p, json_each('["' || replace(p.allergies, ',', '","') || '"]') j
WHERE p.allergies IS NOT NULL AND trim(j.value) = 'Penicillin';` },
      { wrong: `SELECT COUNT(*) FROM patients WHERE allergies LIKE '%Pen%';`, why: 'LIKE on a list matches partial words and cannot tell list items apart; it breaks as soon as values overlap.', fix: `SELECT COUNT(*) FROM patients p, json_each('["' || replace(p.allergies, ',', '","') || '"]') j
WHERE p.allergies IS NOT NULL AND trim(j.value) = 'Penicillin';` },
    ],
    rules: [
      'Store lists as rows in a child table when you design the schema (1NF).',
      'When you receive lists, explode them with json_each before analysing.',
      'Always trim() the exploded values.',
      'group_concat collapses rows back into a string for display.',
    ],
    compare: `<table><tr><th>Task</th><th>SQLite</th><th>PostgreSQL</th></tr>
<tr><td>Array type</td><td>None (TEXT or JSON)</td><td>TEXT[], INT[]</td></tr>
<tr><td>Rows → array</td><td>json_group_array / group_concat</td><td>array_agg / string_agg</td></tr>
<tr><td>Array → rows</td><td>json_each</td><td>unnest</td></tr>
<tr><td>Contains</td><td>EXISTS over json_each</td><td>'Latex' = ANY(arr)</td></tr></table>`,
    realWorld: 'Claims carry lists of diagnosis codes and CPT modifiers; EHR exports put allergies and medications into one delimited field. Analysts explode them to count and join.',
    dialectSql: {
      postgres: `SELECT p.patient_id, trim(a) AS allergy
FROM patients p,
     unnest(string_to_array(p.allergies, ',')) AS a
WHERE p.allergies IS NOT NULL;

SELECT invoice_id, array_agg(cpt_code ORDER BY charge_id) AS cpts
FROM charges GROUP BY invoice_id;`,
      sqlserver: `SELECT p.patient_id, trim(s.value) AS allergy
FROM patients p
CROSS APPLY STRING_SPLIT(p.allergies, ',') AS s;`,
      sqlite: `SELECT p.patient_id, trim(j.value) AS allergy
FROM patients p, json_each('["' || replace(p.allergies, ',', '","') || '"]') j
WHERE p.allergies IS NOT NULL;`,
    },
    tryIt: {
      prompt: 'Collapse: list every CPT code on each invoice in one cell. Then try json_group_array instead of group_concat.',
      starter: `SELECT invoice_id, group_concat(cpt_code, ', ') AS cpt_codes, COUNT(*) AS n
FROM charges
GROUP BY invoice_id
ORDER BY invoice_id
LIMIT 10;`,
    },
    challenge: {
      level: 3,
      prompt: 'How many patients have each allergy? Split the allergies list, and return allergy and patient count, sorted by count descending, then allergy.',
      solution: `SELECT trim(j.value) AS allergy, COUNT(DISTINCT p.patient_id) AS patients
FROM patients p,
     json_each('["' || replace(p.allergies, ',', '","') || '"]') AS j
WHERE p.allergies IS NOT NULL
GROUP BY trim(j.value)
ORDER BY patients DESC, allergy;`,
      hints: [
        'Some patients have more than one allergy in the same cell.',
        'Wrap the list in a JSON array: \'["\' || replace(allergies, \',\', \'","\') || \'"]\'.',
        'Use json_each in the FROM clause and trim(j.value) to get one clean allergy per row.',
        'GROUP BY trim(j.value), COUNT(DISTINCT patient_id), ORDER BY count DESC, allergy.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Which SQLite function returns one row per element of a JSON array?', options: ['json_group_array', 'json_each', 'group_concat', 'json_extract'], answer: 1, why: 'json_each is a table-valued function you place in FROM.' },
      { q: 'What is the PostgreSQL equivalent of json_each on an array?', options: ['array_agg', 'unnest', 'string_agg', 'ANY'], answer: 1, why: 'unnest(array) expands an array into rows.' },
    ],
  },

  // ---------------------------------------------------------------- 06
  {
    id: 'advanced-06',
    goals: [
      'Understand what full-text search does beyond LIKE',
      'Search charge descriptions with LIKE, word boundaries and a relevance score',
      'Know the FTS syntax in SQLite FTS5, PostgreSQL, MySQL and SQL Server',
      'Know why LIKE \'%word%\' does not scale',
    ],
    concept: `<p><b>Full-text search (FTS)</b> finds rows whose text contains words, the way a search engine does. An FTS engine splits text into <b>tokens</b> (words), stores an <b>inverted index</b> (word → rows), and can rank results by relevance.</p>
<p>SQLite has an FTS extension called <b>FTS5</b>, but the in-browser build used here does not include it. So we do the job with plain SQL:</p>
<ul>
<li><code>LIKE '%visit%'</code> finds a substring (case-insensitive for ASCII in SQLite).</li>
<li><code>' ' || description || ' ' LIKE '% therapy %'</code> matches a <b>whole word</b>.</li>
<li>Adding up matches per search term gives a simple <b>relevance score</b>.</li>
</ul>
<p>The dialect tabs show the real FTS syntax you would use in production.</p>`,
    why: 'Users type words, not exact values. Search boxes over notes, descriptions and claims need word matching and ranking.',
    when: 'Use LIKE for small tables and simple lookups. Use a real FTS index for large text, many words, stemming (visit/visits) and ranking.',
    analogy: 'The index at the back of a medical coding manual: instead of reading every page for "therapy", you look up the word and jump straight to the pages listed.',
    exampleSql: `SELECT DISTINCT cpt_code, description FROM charges ORDER BY cpt_code`,
    syntax: `-- substring
WHERE col LIKE '%word%'
-- whole word
WHERE ' ' || col || ' ' LIKE '% word %'
-- simple relevance
SELECT col, (col LIKE '%a%') + (col LIKE '%b%') AS score ... ORDER BY score DESC`,
    sql: `SELECT description,
       COUNT(*) AS charges,
       (' ' || lower(description) || ' ' LIKE '% therapy %') AS whole_word_match
FROM charges
WHERE description LIKE '%therapy%'
GROUP BY description
ORDER BY description;`,
    breakdown: [
      ['WHERE description LIKE \'%therapy%\'', 'Substring match: finds "Manual therapy" AND "Psychotherapy".'],
      ['\' \' || lower(description) || \' \' LIKE \'% therapy %\'', 'Whole-word check: padding with spaces makes "therapy" match only as a separate word.'],
      ['(... LIKE ...) AS whole_word_match', 'In SQLite a comparison returns 1 or 0, handy as a flag or score.'],
      ['GROUP BY description', 'One row per distinct description with its charge count.'],
    ],
    internals: `<p><code>LIKE '%x%'</code> has a leading wildcard, so no B-tree index can help: SQLite reads every row and scans every string. An FTS index is an <b>inverted index</b>: for each token it stores the list of row ids, so a search reads just those lists. FTS5 ranks with BM25, which rewards rare words and short documents.</p>`,
    mistakes: [
      { wrong: `SELECT description FROM charges WHERE description = 'visit';`, why: '= compares the whole value, so nothing matches.', fix: `SELECT DISTINCT description FROM charges WHERE description LIKE '%visit%';` },
      { wrong: `SELECT DISTINCT description FROM charges WHERE description LIKE '%therapy%';`, why: 'If you meant the word "therapy", substring search also returns Psychotherapy.', fix: `SELECT DISTINCT description FROM charges WHERE ' ' || lower(description) || ' ' LIKE '% therapy %';` },
    ],
    rules: [
      'LIKE with a leading % always scans the whole table.',
      'Pad with spaces to approximate whole-word matching (punctuation still needs care).',
      'A boolean expression in SQLite is 1/0: add them up for a relevance score.',
      'Use a real FTS index (FTS5, tsvector, FULLTEXT) in production.',
    ],
    compare: `<table><tr><th>Feature</th><th>LIKE</th><th>Full-text index</th></tr>
<tr><td>Speed on big tables</td><td>Full scan</td><td>Index lookup</td></tr>
<tr><td>Whole words</td><td>Manual tricks</td><td>Built in (tokenizer)</td></tr>
<tr><td>Stemming (visit/visits)</td><td>No</td><td>Yes (language-aware)</td></tr>
<tr><td>Ranking</td><td>DIY score</td><td>BM25 / ts_rank</td></tr></table>`,
    realWorld: 'Coders search CPT descriptions; denial teams search free-text remittance remarks; clinical systems search visit notes. All use FTS indexes at scale.',
    dialectSql: {
      sqlite: `-- Needs the FTS5 extension (not in this browser build)
CREATE VIRTUAL TABLE charge_fts USING fts5(description, content='charges', content_rowid='charge_id');
INSERT INTO charge_fts(charge_fts) VALUES ('rebuild');
SELECT rowid, description, bm25(charge_fts) AS score
FROM charge_fts WHERE charge_fts MATCH 'visit OR patient'
ORDER BY score;`,
      postgres: `SELECT description,
       ts_rank(to_tsvector('english', description), q) AS score
FROM charges, to_tsquery('english', 'visit | patient') AS q
WHERE to_tsvector('english', description) @@ q
ORDER BY score DESC;
-- index: CREATE INDEX ON charges USING GIN (to_tsvector('english', description));`,
      mysql: `ALTER TABLE charges ADD FULLTEXT INDEX ft_desc (description);
SELECT description, MATCH(description) AGAINST ('visit patient') AS score
FROM charges
WHERE MATCH(description) AGAINST ('visit patient' IN NATURAL LANGUAGE MODE)
ORDER BY score DESC;`,
      sqlserver: `-- requires a full-text catalog and index on charges(description)
SELECT c.description, k.RANK
FROM charges c
JOIN FREETEXTTABLE(charges, description, 'visit patient') AS k ON k.[KEY] = c.charge_id
ORDER BY k.RANK DESC;`,
    },
    tryIt: {
      prompt: 'Search for "blood". Then make it a whole-word search and see what changes (hint: "(blood draw)" has a parenthesis before it).',
      starter: `SELECT DISTINCT description
FROM charges
WHERE description LIKE '%blood%';`,
    },
    challenge: {
      level: 3,
      prompt: 'Build a tiny search engine for the query "patient visit": for each distinct charge description containing either word, return description, a score (1 point per word found) and the number of charges. Sort by score descending, then description.',
      solution: `SELECT description,
       (lower(description) LIKE '%patient%') + (lower(description) LIKE '%visit%') AS score,
       COUNT(*) AS charges
FROM charges
WHERE lower(description) LIKE '%patient%' OR lower(description) LIKE '%visit%'
GROUP BY description
ORDER BY score DESC, description;`,
      hints: [
        'Each LIKE comparison returns 1 or 0 in SQLite.',
        'Add the two comparisons together to get a score from 0 to 2.',
        'Keep only descriptions where at least one word matches (OR in WHERE).',
        'GROUP BY description, COUNT(*), ORDER BY score DESC, description.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why can\'t a normal index speed up LIKE \'%visit%\'?', options: ['LIKE is case-insensitive', 'The leading wildcard means the match can start anywhere, so sorted order does not help', 'Indexes only work on numbers', 'It can, always'], answer: 1, why: 'B-tree indexes help with prefixes (LIKE \'visit%\'), not with substrings that may start in the middle.' },
      { q: 'What does an FTS inverted index map?', options: ['Rows to columns', 'Each word to the rows that contain it', 'Each row to its primary key', 'Dates to months'], answer: 1, why: 'That is why a search for a word only reads the rows listed for it.' },
    ],
  },

  // ---------------------------------------------------------------- 07
  {
    id: 'advanced-07',
    goals: [
      'Turn row values into columns (pivot) with SUM(CASE ...)',
      'Build a location × month revenue grid',
      'Keep empty locations in the grid with a LEFT JOIN',
      'Know the PIVOT syntax of SQL Server and Oracle',
    ],
    concept: `<p><b>Pivoting</b> rotates data: values that are in <i>rows</i> (months) become <i>columns</i> (Jun, Jul, Aug). The result looks like a spreadsheet grid.</p>
<p>The portable way to pivot is <b>conditional aggregation</b>: one <code>SUM(CASE WHEN month = 'X' THEN amount ELSE 0 END)</code> per output column. Each CASE lets through only the rows for its column, and SUM adds them.</p>
<p>You must know the columns in advance (they are written in the query). If the list changes, you need dynamic SQL (lesson "Dynamic SQL").</p>`,
    why: 'People read grids faster than long lists. Finance wants "locations down the side, months across the top".',
    when: 'Use it for cross-tab reports: revenue by location × month, invoice counts by payor × status, charges by practitioner × CPT.',
    analogy: 'Sorting paper invoices into a wall of pigeonholes: one row of holes per clinic, one column per month. Each invoice drops into exactly one hole, and you total each hole.',
    exampleSql: `SELECT location_id, strftime('%Y-%m', invoice_date) AS month, total_amount
FROM invoices WHERE invoice_date >= '2026-06-01' ORDER BY location_id, month`,
    syntax: `SELECT row_key,
       SUM(CASE WHEN col_key = 'A' THEN value ELSE 0 END) AS a,
       SUM(CASE WHEN col_key = 'B' THEN value ELSE 0 END) AS b
FROM t
GROUP BY row_key;`,
    sql: `SELECT l.location_name,
       SUM(CASE WHEN strftime('%Y-%m', i.invoice_date) = '2026-06' THEN i.total_amount ELSE 0 END) AS jun_2026,
       SUM(CASE WHEN strftime('%Y-%m', i.invoice_date) = '2026-07' THEN i.total_amount ELSE 0 END) AS jul_2026,
       SUM(CASE WHEN strftime('%Y-%m', i.invoice_date) = '2026-08' THEN i.total_amount ELSE 0 END) AS aug_2026,
       TOTAL(i.total_amount) AS three_month_total
FROM treatment_locations l
LEFT JOIN invoices i
       ON i.location_id = l.location_id
      AND i.invoice_date BETWEEN '2026-06-01' AND '2026-08-31'
GROUP BY l.location_id
ORDER BY l.location_id;`,
    breakdown: [
      ['FROM treatment_locations l LEFT JOIN invoices i', 'Start from locations so every clinic gets a row, even Eastside with no invoices.'],
      ['AND i.invoice_date BETWEEN ... in the ON clause', 'The date filter lives in ON, so it does not remove locations without invoices.'],
      ['SUM(CASE WHEN ... = \'2026-06\' THEN i.total_amount ELSE 0 END)', 'Each column only adds up invoices from its own month.'],
      ['TOTAL(i.total_amount)', 'SQLite\'s TOTAL() returns 0.0 instead of NULL when there is nothing to add.'],
      ['GROUP BY l.location_id', 'One row per location.'],
    ],
    visual: { type: 'flow', steps: [['invoices (Jun-Aug 2026)', 'one row per invoice'], ['CASE per month column', 'amount goes to one column, 0 elsewhere'], ['GROUP BY location', 'rows collapse per location'], ['SUM each column', 'location × month grid']] },
    internals: `<p>The engine does ordinary grouping: one pass over the rows, one accumulator per output column per group. Pivoting with CASE costs almost nothing extra; the CASE is evaluated once per row per column.</p>`,
    mistakes: [
      { wrong: `SELECT l.location_name, SUM(CASE WHEN strftime('%Y-%m', i.invoice_date) = '2026-06' THEN i.total_amount ELSE 0 END) AS jun
FROM treatment_locations l LEFT JOIN invoices i ON i.location_id = l.location_id
WHERE i.invoice_date >= '2026-06-01'
GROUP BY l.location_id;`, why: 'Filtering the right-hand table in WHERE turns the LEFT JOIN into an inner join, so Eastside Family Clinic disappears.', fix: `SELECT l.location_name, SUM(CASE WHEN strftime('%Y-%m', i.invoice_date) = '2026-06' THEN i.total_amount ELSE 0 END) AS jun
FROM treatment_locations l LEFT JOIN invoices i ON i.location_id = l.location_id AND i.invoice_date >= '2026-06-01'
GROUP BY l.location_id;` },
      { wrong: `SELECT location_id, CASE WHEN strftime('%m', invoice_date) = '06' THEN total_amount END AS jun
FROM invoices;`, why: 'Without SUM and GROUP BY you get one row per invoice with mostly NULLs, not a grid. Also \'%m\' alone mixes June 2025 and June 2026.', fix: `SELECT location_id, SUM(CASE WHEN strftime('%Y-%m', invoice_date) = '2026-06' THEN total_amount ELSE 0 END) AS jun
FROM invoices GROUP BY location_id;` },
    ],
    rules: [
      'One SUM(CASE ...) per output column.',
      'ELSE 0 makes empty cells 0 instead of NULL.',
      'Put filters on the optional table in the ON clause of a LEFT JOIN.',
      'Pivot keys should include the year: \'%Y-%m\', not just \'%m\'.',
    ],
    compare: `<table><tr><th>Method</th><th>Where</th><th>Notes</th></tr>
<tr><td>SUM(CASE ...)</td><td>Every database</td><td>Portable, flexible</td></tr>
<tr><td>SUM(x) FILTER (WHERE ...)</td><td>SQLite, PostgreSQL</td><td>Cleaner syntax, same result</td></tr>
<tr><td>PIVOT operator</td><td>SQL Server, Oracle</td><td>Compact, but columns still fixed</td></tr>
<tr><td>crosstab()</td><td>PostgreSQL tablefunc</td><td>Extension function</td></tr></table>`,
    realWorld: 'Month-end revenue packs, payer × status dashboards and denial-reason heat maps are all pivots.',
    deep: `<p>SQLite also accepts <code>SUM(i.total_amount) FILTER (WHERE strftime('%Y-%m', i.invoice_date) = '2026-06')</code>. Note that FILTER returns NULL for an empty cell, while CASE ... ELSE 0 returns 0.</p>`,
    dialectSql: {
      sqlserver: `SELECT location_id, [2026-06], [2026-07], [2026-08]
FROM (SELECT location_id, FORMAT(invoice_date, 'yyyy-MM') AS m, total_amount FROM invoices) AS src
PIVOT (SUM(total_amount) FOR m IN ([2026-06], [2026-07], [2026-08])) AS p;`,
      oracle: `SELECT * FROM (
  SELECT location_id, TO_CHAR(invoice_date, 'YYYY-MM') AS m, total_amount FROM invoices)
PIVOT (SUM(total_amount) FOR m IN ('2026-06' AS jun, '2026-07' AS jul, '2026-08' AS aug));`,
      postgres: `SELECT location_id,
       SUM(total_amount) FILTER (WHERE to_char(invoice_date, 'YYYY-MM') = '2026-06') AS jun,
       SUM(total_amount) FILTER (WHERE to_char(invoice_date, 'YYYY-MM') = '2026-07') AS jul
FROM invoices GROUP BY location_id;`,
    },
    tryIt: {
      prompt: 'Pivot invoice COUNTS by status for each payor. Add a column for Void.',
      starter: `SELECT payor_id,
       SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) AS paid,
       SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) AS overdue,
       SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS open
FROM invoices
GROUP BY payor_id
ORDER BY payor_id;`,
    },
    challenge: {
      level: 3,
      prompt: 'Build a revenue grid: one row per treatment location (all 6, by location_id) with columns location_name, billed in 2025, billed in 2026, and total billed. Use invoice total_amount, ignore Void invoices, and show 0 (not NULL) for empty cells.',
      solution: `SELECT l.location_name,
       SUM(CASE WHEN strftime('%Y', i.invoice_date) = '2025' THEN i.total_amount ELSE 0 END) AS billed_2025,
       SUM(CASE WHEN strftime('%Y', i.invoice_date) = '2026' THEN i.total_amount ELSE 0 END) AS billed_2026,
       TOTAL(i.total_amount) AS billed_total
FROM treatment_locations l
LEFT JOIN invoices i ON i.location_id = l.location_id AND i.status <> 'Void'
GROUP BY l.location_id
ORDER BY l.location_id;`,
      hints: [
        'Start FROM treatment_locations and LEFT JOIN invoices so every location appears.',
        'Put the status <> \'Void\' filter inside the ON clause.',
        'One SUM(CASE WHEN strftime(\'%Y\', invoice_date) = \'2025\' THEN total_amount ELSE 0 END) per year column.',
        'Use TOTAL(i.total_amount) (or COALESCE(SUM(...), 0)) for the total, GROUP BY l.location_id, ORDER BY l.location_id.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What does ELSE 0 do in SUM(CASE WHEN ... THEN amount ELSE 0 END)?', options: ['Nothing', 'Makes cells with no matching rows show 0 instead of NULL', 'Filters out rows', 'Sorts the columns'], answer: 1, why: 'Without ELSE, non-matching rows give NULL; SUM of only NULLs is NULL.' },
      { q: 'Why must a pivot query list its columns explicitly?', options: ['SQL needs the output columns known when the query is written', 'For performance', 'Because of GROUP BY', 'It does not'], answer: 0, why: 'A query\'s column list is fixed at parse time. Changing column lists need dynamic SQL.' },
    ],
  },

  // ---------------------------------------------------------------- 08
  {
    id: 'advanced-08',
    goals: [
      'Turn columns back into rows (unpivot) with UNION ALL',
      'Give each unpivoted row a label column',
      'Control the output order with a sort key',
      'Know UNPIVOT and CROSS APPLY VALUES in other databases',
    ],
    concept: `<p><b>Unpivoting</b> is the reverse of pivoting: several columns (<code>billed_2025</code>, <code>billed_2026</code>) become rows with two new columns: a <b>label</b> (which column it came from) and a <b>value</b>.</p>
<p>The portable way is one SELECT per column, glued with <b>UNION ALL</b>:</p>
<pre>SELECT id, '2025' AS year, billed_2025 AS billed FROM grid
UNION ALL
SELECT id, '2026', billed_2026 FROM grid</pre>
<p>Use <code>UNION ALL</code>, not <code>UNION</code>: two cells can legitimately hold the same value, and UNION would silently merge them.</p>`,
    why: 'Wide tables (one column per month or per metric) are hard to filter, chart and aggregate. Long format (one row per value) works with GROUP BY, WHERE and charts.',
    when: 'Use it when data arrives as a spreadsheet grid, when you need to aggregate across several columns, or when a chart tool expects label/value rows.',
    analogy: 'Taking a wall of pigeonholes and emptying it onto a single conveyor belt, sticking a label on each item that says which hole it came from.',
    exampleSql: `SELECT patient_id, first_name, city, email, allergies FROM patients WHERE patient_id <= 5`,
    syntax: `SELECT key, 'col_a' AS attribute, col_a AS value FROM t
UNION ALL
SELECT key, 'col_b', col_b FROM t
UNION ALL
SELECT key, 'col_c', col_c FROM t
ORDER BY key, attribute;`,
    sql: `WITH grid AS (
  SELECT l.location_id, l.location_name,
         SUM(CASE WHEN strftime('%Y', i.invoice_date) = '2025' THEN i.total_amount ELSE 0 END) AS billed_2025,
         SUM(CASE WHEN strftime('%Y', i.invoice_date) = '2026' THEN i.total_amount ELSE 0 END) AS billed_2026
  FROM treatment_locations l
  LEFT JOIN invoices i ON i.location_id = l.location_id
  GROUP BY l.location_id
)
SELECT location_name, '2025' AS year, billed_2025 AS billed FROM grid
UNION ALL
SELECT location_name, '2026', billed_2026 FROM grid
ORDER BY location_name, year;`,
    breakdown: [
      ['WITH grid AS (...)', 'A wide pivot: one row per location, one column per year.'],
      ['SELECT location_name, \'2025\' AS year, billed_2025 AS billed FROM grid', 'Take the 2025 column and label its rows \'2025\'.'],
      ['UNION ALL SELECT location_name, \'2026\', billed_2026 FROM grid', 'Stack the 2026 column underneath. Column names come from the first SELECT.'],
      ['ORDER BY location_name, year', 'ORDER BY applies to the whole UNION result.'],
    ],
    visual: { type: 'setops', a: `SELECT 'Downtown 2025' AS cell UNION ALL SELECT 'Lakeview 2025'`, b: `SELECT 'Downtown 2026' AS cell UNION ALL SELECT 'Lakeview 2026'`, op: 'UNION ALL' },
    internals: `<p>Each branch of the UNION ALL scans the CTE once. SQLite may materialize the CTE (compute it once and store it) or inline it into each branch. For wide tables with many columns, the <code>json_each</code> trick below reads the table only once.</p>`,
    mistakes: [
      { wrong: `SELECT location_id, billed_2025 AS billed FROM (SELECT 1 AS location_id, 100 AS billed_2025, 100 AS billed_2026)
UNION
SELECT location_id, billed_2026 FROM (SELECT 1 AS location_id, 100 AS billed_2025, 100 AS billed_2026);`, why: 'UNION removes duplicates, and there is no label column, so the two equal values collapse into one row. You lose data.', fix: `SELECT location_id, '2025' AS year, billed_2025 AS billed FROM (SELECT 1 AS location_id, 100 AS billed_2025, 100 AS billed_2026)
UNION ALL
SELECT location_id, '2026', billed_2026 FROM (SELECT 1 AS location_id, 100 AS billed_2025, 100 AS billed_2026);` },
    ],
    rules: [
      'Use UNION ALL for unpivoting, never UNION.',
      'Add a label column so each row says where it came from.',
      'All branches need the same number and compatible types of columns.',
      'Names and aliases come from the first SELECT; ORDER BY goes at the very end.',
    ],
    compare: `<table><tr><th>Method</th><th>Databases</th></tr>
<tr><td>UNION ALL per column</td><td>All</td></tr>
<tr><td>UNPIVOT operator</td><td>SQL Server, Oracle</td></tr>
<tr><td>CROSS APPLY (VALUES ...)</td><td>SQL Server</td></tr>
<tr><td>CROSS JOIN LATERAL (VALUES ...)</td><td>PostgreSQL</td></tr>
<tr><td>json_each(json_object(...))</td><td>SQLite</td></tr></table>`,
    realWorld: 'Importing budget spreadsheets (one column per month) into a fact table, and turning KPI summary rows into label/value rows for dashboards.',
    deep: `<p>SQLite single-scan unpivot: <code>SELECT g.location_name, j.key AS year, j.value AS billed FROM grid g, json_each(json_object('2025', g.billed_2025, '2026', g.billed_2026)) j</code>. The object keys become labels.</p>`,
    dialectSql: {
      sqlserver: `SELECT location_name, year, billed
FROM grid
UNPIVOT (billed FOR year IN (billed_2025, billed_2026)) AS u;

-- or
SELECT g.location_name, v.year, v.billed
FROM grid g
CROSS APPLY (VALUES ('2025', g.billed_2025), ('2026', g.billed_2026)) AS v(year, billed);`,
      postgres: `SELECT g.location_name, v.year, v.billed
FROM grid g
CROSS JOIN LATERAL (VALUES ('2025', g.billed_2025), ('2026', g.billed_2026)) AS v(year, billed);`,
      sqlite: `SELECT g.location_name, j.key AS year, j.value AS billed
FROM grid g, json_each(json_object('2025', g.billed_2025, '2026', g.billed_2026)) AS j;`,
    },
    tryIt: {
      prompt: 'Unpivot patient contact fields into (patient_id, field, value) rows, keeping only non-NULL values. Add date_of_birth as a fourth field.',
      starter: `SELECT patient_id, 'city' AS field, city AS value FROM patients WHERE city IS NOT NULL AND patient_id <= 5
UNION ALL
SELECT patient_id, 'email', email FROM patients WHERE email IS NOT NULL AND patient_id <= 5
UNION ALL
SELECT patient_id, 'allergies', allergies FROM patients WHERE allergies IS NOT NULL AND patient_id <= 5
ORDER BY patient_id, field;`,
    },
    challenge: {
      level: 3,
      prompt: 'For invoices 12 and 13, unpivot three metrics into rows: billed (total_amount), paid (sum of payments, 0 if none) and outstanding (billed - paid). Return invoice_id, metric, value, ordered by invoice_id and then in the order billed, paid, outstanding.',
      solution: `WITH m AS (
  SELECT i.invoice_id, i.total_amount AS billed,
         COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS paid
  FROM invoices i WHERE i.invoice_id IN (12, 13)
)
SELECT invoice_id, metric, value FROM (
  SELECT invoice_id, 1 AS k, 'billed' AS metric, billed AS value FROM m
  UNION ALL SELECT invoice_id, 2, 'paid', paid FROM m
  UNION ALL SELECT invoice_id, 3, 'outstanding', billed - paid FROM m
)
ORDER BY invoice_id, k;`,
      hints: [
        'First compute one wide row per invoice with billed and paid (a CTE).',
        'Then write three SELECTs, one per metric, and join them with UNION ALL.',
        'To sort metrics in a custom order, add a numeric sort key column (1, 2, 3) in each branch.',
        'Wrap the UNION ALL in a subquery, select invoice_id, metric, value, and ORDER BY invoice_id, the sort key.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why use UNION ALL instead of UNION to unpivot?', options: ['It is standard', 'UNION would merge rows that happen to have the same values, losing data', 'UNION ALL sorts results', 'UNION does not work with CTEs'], answer: 1, why: 'Two cells can legitimately hold equal values; they must both survive.' },
      { q: 'Where do the column names of a UNION ALL result come from?', options: ['The last SELECT', 'The first SELECT', 'Any SELECT', 'They are numbered'], answer: 1, why: 'Aliases in the first branch name the output columns.' },
    ],
  },

  // ---------------------------------------------------------------- 09
  {
    id: 'advanced-09',
    dialect: 'sqlserver',
    goals: [
      'Understand dynamic SQL: building a query as text and executing it',
      'Build a pivot whose month columns are discovered at run time',
      'Use parameters (sp_executesql) instead of string concatenation to stay safe',
      'Generate SQL text in SQLite, which has no EXECUTE',
    ],
    concept: `<p><b>Dynamic SQL</b> means a program writes a SQL statement as a <b>string</b> and then executes it. It is needed when parts of the query that SQL treats as fixed (table names, column lists, pivot columns) are only known at run time.</p>
<p>Classic example: a revenue pivot with one column per month. Next month there is a new column, so the column list must be generated from the data.</p>
<p>SQL Server does it with <code>EXEC sp_executesql</code>; PostgreSQL with <code>EXECUTE format(...)</code> inside PL/pgSQL; MySQL with <code>PREPARE ... EXECUTE</code>. SQLite has no procedural language, so the application builds the string. We can still use SQLite to <b>generate</b> the SQL text, as in the Try-it.</p>
<p><b>Danger:</b> pasting user input into the string opens the door to <b>SQL injection</b>. Values must be passed as parameters; identifiers must be quoted (<code>QUOTENAME</code>, <code>format('%I')</code>).</p>`,
    why: 'Some query shapes cannot be written ahead of time: variable column lists, user-chosen sort columns, per-tenant table names.',
    when: 'Use it sparingly: dynamic pivots, admin scripts, optional search filters. Prefer static SQL whenever the shape is known.',
    analogy: 'A billing clerk who fills in a form letter: the template is fixed, but the blanks (patient name, amount) are filled from the file. Parameters are the blanks; injection is someone writing extra instructions into a blank.',
    syntax: `DECLARE @sql NVARCHAR(MAX) = N'SELECT ... WHERE status = @s';
EXEC sp_executesql @sql, N'@s NVARCHAR(20)', @s = N'Overdue';`,
    sql: `DECLARE @cols NVARCHAR(MAX), @sql NVARCHAR(MAX);

-- 1. discover the month columns from the data
SELECT @cols = STRING_AGG(QUOTENAME(m), ', ') WITHIN GROUP (ORDER BY m)
FROM (SELECT DISTINCT FORMAT(invoice_date, 'yyyy-MM') AS m
      FROM invoices WHERE invoice_date >= '2026-06-01') AS months;

-- 2. build the pivot query text
SET @sql = N'SELECT location_id, ' + @cols + N'
FROM (SELECT location_id, FORMAT(invoice_date, ''yyyy-MM'') AS m, total_amount
      FROM invoices WHERE invoice_date >= @from) AS src
PIVOT (SUM(total_amount) FOR m IN (' + @cols + N')) AS p;';

-- 3. execute it, passing the date as a parameter
EXEC sp_executesql @sql, N'@from DATE', @from = '2026-06-01';`,
    breakdown: [
      ['DECLARE @cols, @sql', 'Variables that will hold the column list and the final query text.'],
      ['STRING_AGG(QUOTENAME(m), \', \')', 'Builds "[2026-06], [2026-07], [2026-08]". QUOTENAME safely brackets each identifier.'],
      ['SET @sql = N\'SELECT location_id, \' + @cols + ...', 'Glues the fixed parts and the generated column list into one statement.'],
      ['WHERE invoice_date >= @from', 'Values stay as parameters inside the text, never concatenated.'],
      ['EXEC sp_executesql @sql, N\'@from DATE\', @from = ...', 'Runs the text with a typed parameter; the plan can be cached and reused.'],
    ],
    visual: { type: 'flow', steps: [['SELECT DISTINCT months', '2026-06, 2026-07, 2026-08'], ['STRING_AGG + QUOTENAME', '[2026-06], [2026-07], [2026-08]'], ['concatenate into @sql', 'full PIVOT statement text'], ['sp_executesql with @from', 'parsed, planned, executed'], ['result', 'location × month grid']] },
    internals: `<p>Dynamic SQL is compiled at the moment it runs, not when the surrounding procedure was created. With <code>sp_executesql</code> and parameters, the text stays identical between calls, so SQL Server can reuse the cached plan. With concatenated values, each value creates a new text and a new plan (plan-cache bloat) and invites injection.</p>`,
    mistakes: [
      { wrong: `SET @sql = N'SELECT * FROM invoices WHERE status = ''' + @user_input + N'''';
EXEC (@sql);`, why: 'If @user_input is  x\' OR 1=1 --  the query returns every invoice. This is SQL injection.', fix: `EXEC sp_executesql N'SELECT * FROM invoices WHERE status = @s', N'@s NVARCHAR(20)', @s = @user_input;` },
      { wrong: `SET @sql = N'SELECT * FROM ' + @table_name;`, why: 'Identifiers cannot be parameters, but pasting them raw is still injectable.', fix: `SET @sql = N'SELECT * FROM ' + QUOTENAME(@table_name);` },
    ],
    rules: [
      'Values: always parameters. Identifiers: always quoted (QUOTENAME / %I).',
      'Whitelist allowed identifiers (column names) against a known list.',
      'Print or log the generated SQL while developing.',
      'Prefer static SQL; use dynamic SQL only where the shape truly varies.',
    ],
    compare: `<table><tr><th>Database</th><th>Execute text</th><th>Safe quoting</th></tr>
<tr><td>SQL Server</td><td>sp_executesql</td><td>QUOTENAME, parameters</td></tr>
<tr><td>PostgreSQL</td><td>EXECUTE ... USING (PL/pgSQL)</td><td>format('%I', ...), quote_ident</td></tr>
<tr><td>MySQL</td><td>PREPARE / EXECUTE ... USING</td><td>backticks, ? parameters</td></tr>
<tr><td>Oracle</td><td>EXECUTE IMMEDIATE ... USING</td><td>DBMS_ASSERT</td></tr>
<tr><td>SQLite</td><td>None (application builds strings)</td><td>host-language parameters</td></tr></table>`,
    realWorld: 'Report builders generate pivots for whatever months a user picks; multi-tenant billing systems route queries to per-client schemas; search screens add optional filters.',
    dialectSql: {
      postgres: `DO $$
DECLARE cols text; q text;
BEGIN
  SELECT string_agg(format('SUM(total_amount) FILTER (WHERE to_char(invoice_date,''YYYY-MM'') = %L) AS %I', m, m), ', ' ORDER BY m)
    INTO cols
  FROM (SELECT DISTINCT to_char(invoice_date, 'YYYY-MM') AS m FROM invoices WHERE invoice_date >= DATE '2026-06-01') s;
  q := 'CREATE TEMP TABLE pivot_out AS SELECT location_id, ' || cols || ' FROM invoices GROUP BY location_id';
  EXECUTE q;
END $$;`,
      mysql: `SET @s = 'SELECT * FROM invoices WHERE status = ?';
PREPARE stmt FROM @s;
SET @status = 'Overdue';
EXECUTE stmt USING @status;
DEALLOCATE PREPARE stmt;`,
      sqlite: `-- SQLite has no EXECUTE: generate the text, then the app runs it.
SELECT 'SELECT location_id, ' ||
       group_concat('SUM(CASE WHEN strftime(''%Y-%m'', invoice_date) = ''' || m || ''' THEN total_amount ELSE 0 END) AS "' || m || '"', ', ' ORDER BY m) ||
       ' FROM invoices GROUP BY location_id;' AS generated_sql
FROM (SELECT DISTINCT strftime('%Y-%m', invoice_date) AS m FROM invoices WHERE invoice_date >= '2026-06-01');`,
    },
    tryIt: {
      prompt: 'SQLite cannot execute text, but it can WRITE the pivot query for you. Run this, copy the generated_sql value, and run that. Change the start date to 2026-01-01 and watch new columns appear.',
      starter: `SELECT 'SELECT location_id, ' ||
       group_concat('SUM(CASE WHEN strftime(''%Y-%m'', invoice_date) = ''' || m || ''' THEN total_amount ELSE 0 END) AS "' || m || '"', ', ' ORDER BY m) ||
       ' FROM invoices GROUP BY location_id ORDER BY location_id;' AS generated_sql
FROM (SELECT DISTINCT strftime('%Y-%m', invoice_date) AS m
      FROM invoices WHERE invoice_date >= '2026-06-01');`,
    },
    challenge: {
      level: 3,
      prompt: 'Generate pivot column expressions (as text) with SQLite: for each treatment location, return location_id and the expression SUM(CASE WHEN location_id = <id> THEN total_amount ELSE 0 END) AS "<location_name>". Order by location_id.',
      solution: `SELECT location_id,
       'SUM(CASE WHEN location_id = ' || location_id || ' THEN total_amount ELSE 0 END) AS "' || location_name || '"' AS column_sql
FROM treatment_locations
ORDER BY location_id;`,
      hints: [
        'This is string building: the output is SQL text, not numbers.',
        'Concatenate with ||: literal text, then location_id, then more text.',
        'Double quotes inside a single-quoted SQL string need no escaping: \'AS "\' || location_name || \'"\'.',
        'SELECT location_id, \'SUM(CASE WHEN location_id = \' || location_id || \' THEN total_amount ELSE 0 END) AS "\' || location_name || \'"\' FROM treatment_locations ORDER BY location_id.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'How should a user-supplied status value be put into dynamic SQL?', options: ['Concatenate it inside quotes', 'As a parameter (sp_executesql / USING / ?)', 'Wrap it in QUOTENAME', 'Upper-case it first'], answer: 1, why: 'Parameters are never parsed as SQL, so they cannot inject code.' },
      { q: 'Why is a dynamic pivot often necessary?', options: ['PIVOT is slow', 'The output column list must be fixed in the query text, but months change', 'Static SQL cannot aggregate', 'To avoid GROUP BY'], answer: 1, why: 'New months mean new columns, so the text has to be regenerated.' },
    ],
  },

  // ---------------------------------------------------------------- 10
  {
    id: 'advanced-10',
    goals: [
      'Create a temporary table that only lives for the session',
      'Stage an intermediate result (open receivables) and reuse it several times',
      'Index a temporary table',
      'Choose between temp tables, CTEs and views',
    ],
    concept: `<p>A <b>temporary table</b> is a real table that exists only for your connection. When you disconnect, it disappears. Other users cannot see it.</p>
<p>In SQLite: <code>CREATE TEMP TABLE name AS SELECT ...</code>. It lives in a separate <code>temp</code> schema.</p>
<p>Why not just a CTE? A CTE exists only inside <i>one</i> statement. A temp table survives across <i>many</i> statements: you can compute an expensive result once (for example every open invoice with its balance), index it, and then run several reports on it.</p>`,
    why: 'Breaking a big problem into stored steps makes it faster (compute once, reuse) and easier to debug (inspect each step).',
    when: 'Use it in multi-step scripts, month-end jobs and ETL, when several queries need the same intermediate result.',
    analogy: 'A scratch worksheet at the billing desk: you copy all open invoices onto it, work through several calculations, and throw it away at the end of the day.',
    exampleSql: `SELECT invoice_id, patient_id, status, due_date, total_amount FROM invoices WHERE status IN ('Open','Overdue','Partially Paid') ORDER BY invoice_id LIMIT 10`,
    syntax: `CREATE TEMP TABLE work AS
SELECT ... FROM ...;

CREATE INDEX idx_work_key ON work(key_col);

SELECT ... FROM work ...;   -- reuse as many times as needed
DROP TABLE work;            -- optional: it vanishes on disconnect anyway`,
    sql: `CREATE TEMP TABLE open_ar AS
SELECT i.invoice_id, i.patient_id, i.due_date,
       i.total_amount - COALESCE((SELECT SUM(p.amount) FROM payments p
                                  WHERE p.invoice_id = i.invoice_id), 0) AS balance
FROM invoices i
WHERE i.status IN ('Open', 'Overdue', 'Partially Paid');

CREATE INDEX idx_open_ar_patient ON open_ar(patient_id);

SELECT patient_id, COUNT(*) AS open_invoices, SUM(balance) AS balance
FROM open_ar
GROUP BY patient_id
ORDER BY balance DESC
LIMIT 8;`,
    breakdown: [
      ['CREATE TEMP TABLE open_ar AS SELECT ...', 'Stores the result of the query in a session-only table.'],
      ['total_amount - COALESCE((SELECT SUM(...)), 0)', 'Balance = billed minus payments (0 if no payments).'],
      ['CREATE INDEX idx_open_ar_patient ON open_ar(patient_id)', 'Temp tables can be indexed like any table.'],
      ['SELECT ... FROM open_ar GROUP BY patient_id', 'Now any number of reports can read the staged data cheaply.'],
    ],
    visual: { type: 'flow', steps: [['invoices + payments', 'expensive join/subquery'], ['CREATE TEMP TABLE open_ar', 'computed once'], ['CREATE INDEX', 'fast lookups'], ['report 1, report 2, report 3 ...', 'reuse without recomputing'], ['disconnect', 'table disappears']] },
    internals: `<p>SQLite keeps temp tables in a separate temp database (in memory or a temp file, depending on <code>temp_store</code>). Writes to it are not journaled like the main database. In SQL Server, <code>#temp</code> tables live in <code>tempdb</code>, have statistics and can be indexed; <code>##global</code> temp tables are visible to all sessions.</p>`,
    mistakes: [
      { wrong: `WITH open_ar AS (SELECT invoice_id, patient_id FROM invoices WHERE status = 'Overdue')
SELECT COUNT(*) FROM open_ar;
SELECT * FROM open_ar;`, why: 'A CTE only exists for the one statement it belongs to. The second SELECT fails: no such table.', fix: `CREATE TEMP TABLE open_ar AS SELECT invoice_id, patient_id FROM invoices WHERE status = 'Overdue';
SELECT COUNT(*) FROM open_ar;
SELECT * FROM open_ar;` },
    ],
    rules: [
      'TEMP tables are private to your connection and vanish when it closes.',
      'Use them when a result is reused by several statements.',
      'A temp table is a snapshot: it does not update when the source changes.',
      'Name them clearly and drop them when a long session is done.',
    ],
    compare: `<table><tr><th></th><th>CTE</th><th>Temp table</th><th>View</th></tr>
<tr><td>Lifetime</td><td>One statement</td><td>Session</td><td>Permanent</td></tr>
<tr><td>Stores data</td><td>No (maybe internally)</td><td>Yes (snapshot)</td><td>No</td></tr>
<tr><td>Indexable</td><td>No</td><td>Yes</td><td>No (except materialized/indexed views)</td></tr>
<tr><td>Visible to others</td><td>No</td><td>No</td><td>Yes</td></tr></table>`,
    realWorld: 'Month-end close scripts stage open receivables, claim-scrubbing jobs stage batches of claims, and ETL loads land raw files in temp tables before merging.',
    deep: `<p>SQL Server: <code>SELECT ... INTO #open_ar FROM ...</code>. PostgreSQL: <code>CREATE TEMP TABLE ... ON COMMIT DROP</code> ties the table to a transaction. Oracle has <i>global temporary tables</i>: the definition is permanent, but each session sees only its own rows.</p>`,
    tryIt: {
      prompt: 'Stage overdue invoices in a temp table, then run two different reports from it.',
      starter: `CREATE TEMP TABLE overdue AS
SELECT invoice_id, patient_id, location_id, total_amount,
       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_late
FROM invoices WHERE status = 'Overdue';

SELECT location_id, COUNT(*) AS n, SUM(total_amount) AS amount FROM overdue GROUP BY location_id;
SELECT * FROM overdue ORDER BY days_late DESC LIMIT 5;`,
    },
    challenge: {
      level: 3,
      prompt: 'A challenge answer must be one statement, so use a CTE as an inline "temp table": compute each open receivable (status Open, Overdue or Partially Paid) with its balance (total_amount minus payments), then return location_id, number of open invoices, total balance and the largest single invoice balance, for locations whose total balance is at least 500. Sort by total balance descending, then location_id.',
      solution: `WITH open_ar AS (
  SELECT i.invoice_id, i.location_id,
         i.total_amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS balance
  FROM invoices i
  WHERE i.status IN ('Open', 'Overdue', 'Partially Paid')
)
SELECT location_id, COUNT(*) AS open_invoices, SUM(balance) AS balance, MAX(balance) AS largest_balance
FROM open_ar
GROUP BY location_id
HAVING SUM(balance) >= 500
ORDER BY balance DESC, location_id;`,
      hints: [
        'Put the staging query in WITH open_ar AS (...), and keep location_id in it.',
        'Balance = total_amount - COALESCE((SELECT SUM(amount) FROM payments ...), 0).',
        'GROUP BY location_id with COUNT(*), SUM(balance) and MAX(balance); filter groups with HAVING SUM(balance) >= 500.',
        'ORDER BY the total balance DESC, then location_id.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What happens to a TEMP table when the connection closes?', options: ['It is saved to the main database', 'It is dropped automatically', 'It becomes a view', 'Other users can still see it'], answer: 1, why: 'Temp tables are session-scoped.' },
      { q: 'When is a temp table better than a CTE?', options: ['Always', 'When several statements need the same intermediate result', 'When you need recursion', 'Never'], answer: 1, why: 'A CTE lives for a single statement; a temp table lives for the session and can be indexed.' },
    ],
  },

  // ---------------------------------------------------------------- 11
  {
    id: 'advanced-11',
    dialect: 'sqlserver',
    goals: [
      'Know what a table variable is (SQL Server DECLARE @t TABLE)',
      'Compare table variables with temp tables',
      'Emulate a small table variable in SQLite with a VALUES CTE',
      'Use an inline list of ids as a lookup table',
    ],
    concept: `<p>A <b>table variable</b> is a variable that holds rows, declared like <code>DECLARE @watchlist TABLE (patient_id INT PRIMARY KEY, reason NVARCHAR(50))</code>. It exists only inside one batch or procedure, like any local variable.</p>
<p>It is mainly a SQL Server feature (PostgreSQL uses arrays or temp tables; Oracle uses PL/SQL collections). Table variables are best for <b>small</b> sets of rows: a list of ids to process, a lookup of codes, the output of a procedure step.</p>
<p>SQLite has no variables at all. The closest equivalent is a CTE built from <code>VALUES</code>: <code>WITH watchlist(patient_id, reason) AS (VALUES (7, 'Multiple overdue'), ...)</code>. It behaves like a tiny inline table you can join to.</p>`,
    why: 'Procedures often need to hold a small working set of rows between steps without the overhead of creating a real table.',
    when: 'Use table variables for small row sets (tens to a few thousand rows) inside procedures. For large sets, use temp tables, which have statistics.',
    analogy: 'A sticky note with five patient numbers on it that a collector keeps on the desk while making calls. It is not filed anywhere and is thrown away at the end of the shift.',
    syntax: `DECLARE @t TABLE (id INT PRIMARY KEY, note NVARCHAR(50));
INSERT INTO @t VALUES (1, 'a'), (2, 'b');
SELECT ... FROM some_table s JOIN @t t ON t.id = s.id;`,
    sql: `DECLARE @watchlist TABLE (
  patient_id INT PRIMARY KEY,
  reason     NVARCHAR(50)
);

INSERT INTO @watchlist (patient_id, reason)
VALUES (7, N'Multiple overdue'), (12, N'Consecutive overdue'), (16, N'Self-pay overdue');

SELECT w.patient_id, w.reason,
       COUNT(i.invoice_id)  AS overdue_invoices,
       SUM(i.total_amount)  AS overdue_amount
FROM @watchlist AS w
LEFT JOIN invoices AS i
       ON i.patient_id = w.patient_id AND i.status = 'Overdue'
GROUP BY w.patient_id, w.reason
ORDER BY overdue_amount DESC;`,
    breakdown: [
      ['DECLARE @watchlist TABLE (...)', 'Declares a variable whose value is a set of rows, with a primary key.'],
      ['INSERT INTO @watchlist ... VALUES (...)', 'Fills it like a normal table.'],
      ['FROM @watchlist AS w LEFT JOIN invoices', 'Join it like any table.'],
      ['GROUP BY w.patient_id, w.reason', 'One summary row per watched patient.'],
    ],
    internals: `<p>SQL Server stores table variables in tempdb just like temp tables, but historically did not keep statistics on them and estimated they hold 1 row. SQL Server 2019 added <i>deferred compilation</i>, which uses the real row count at first execution. Table variables are not affected by ROLLBACK, which can be useful for logging inside a failed transaction.</p>`,
    mistakes: [
      { wrong: `DECLARE @big TABLE (invoice_id INT);
INSERT INTO @big SELECT invoice_id FROM huge_claim_history;  -- millions of rows`, why: 'Table variables have poor statistics; joins against millions of rows often get bad plans.', fix: `SELECT invoice_id INTO #big FROM huge_claim_history;
CREATE INDEX ix_big ON #big(invoice_id);` },
    ],
    rules: [
      'Table variables are scoped to the batch/procedure.',
      'Good for small sets; use temp tables for big ones.',
      'In SQLite, use WITH name(cols) AS (VALUES ...) as an inline table.',
      'Declare a primary key to prevent duplicates and help lookups.',
    ],
    compare: `<table><tr><th></th><th>@table variable</th><th>#temp table</th><th>SQLite VALUES CTE</th></tr>
<tr><td>Scope</td><td>Batch / procedure</td><td>Session</td><td>One statement</td></tr>
<tr><td>Statistics</td><td>Limited</td><td>Yes</td><td>n/a</td></tr>
<tr><td>Indexes</td><td>PK / UNIQUE / inline INDEX</td><td>Any</td><td>None</td></tr>
<tr><td>Affected by ROLLBACK</td><td>No</td><td>Yes</td><td>n/a</td></tr></table>`,
    realWorld: 'Collections procedures hold a work queue of invoice ids; claim batch procedures hold the ids submitted in this run; table-valued parameters pass a list of ids from the application.',
    dialectSql: {
      sqlite: `WITH watchlist(patient_id, reason) AS (
  VALUES (7, 'Multiple overdue'), (12, 'Consecutive overdue'), (16, 'Self-pay overdue')
)
SELECT w.patient_id, w.reason, COUNT(i.invoice_id) AS overdue_invoices, SUM(i.total_amount) AS overdue_amount
FROM watchlist w
LEFT JOIN invoices i ON i.patient_id = w.patient_id AND i.status = 'Overdue'
GROUP BY w.patient_id, w.reason
ORDER BY overdue_amount DESC;`,
      postgres: `-- no table variables; use a VALUES list or a temp table
WITH watchlist(patient_id, reason) AS (
  VALUES (7, 'Multiple overdue'), (12, 'Consecutive overdue'), (16, 'Self-pay overdue')
)
SELECT w.patient_id, COUNT(i.invoice_id)
FROM watchlist w LEFT JOIN invoices i ON i.patient_id = w.patient_id AND i.status = 'Overdue'
GROUP BY w.patient_id;`,
    },
    tryIt: {
      prompt: 'This is the SQLite version (a VALUES CTE). Add patient 3 with the reason \'Medicaid follow-up\' and run it.',
      starter: `WITH watchlist(patient_id, reason) AS (
  VALUES (7, 'Multiple overdue'), (12, 'Consecutive overdue'), (16, 'Self-pay overdue')
)
SELECT w.patient_id, w.reason,
       COUNT(i.invoice_id) AS overdue_invoices,
       TOTAL(i.total_amount) AS overdue_amount
FROM watchlist w
LEFT JOIN invoices i ON i.patient_id = w.patient_id AND i.status = 'Overdue'
GROUP BY w.patient_id, w.reason
ORDER BY overdue_amount DESC;`,
    },
    challenge: {
      level: 3,
      prompt: 'A collector has a call list of invoices 3, 9, 25 and 37, each with a priority (1, 2, 1, 3). Using a VALUES CTE as the list, return invoice_id, priority, patient full name and the invoice status. Sort by priority, then invoice_id.',
      solution: `WITH call_list(invoice_id, priority) AS (
  VALUES (3, 1), (9, 2), (25, 1), (37, 3)
)
SELECT c.invoice_id, c.priority, p.first_name || ' ' || p.last_name AS patient, i.status
FROM call_list c
JOIN invoices i ON i.invoice_id = c.invoice_id
JOIN patients p ON p.patient_id = i.patient_id
ORDER BY c.priority, c.invoice_id;`,
      hints: [
        'WITH call_list(invoice_id, priority) AS (VALUES (3, 1), ...) creates an inline table.',
        'Join call_list to invoices on invoice_id to get the status and patient_id.',
        'Join patients to get the name: first_name || \' \' || last_name.',
        'ORDER BY c.priority, c.invoice_id.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What is the scope of a SQL Server table variable?', options: ['The whole server', 'The session', 'The batch or procedure that declares it', 'Forever'], answer: 2, why: 'Like any local variable, it disappears when the batch or procedure ends.' },
      { q: 'Which SQLite construct best replaces a small table variable?', options: ['A trigger', 'WITH t(cols) AS (VALUES ...)', 'A view', 'PRAGMA'], answer: 1, why: 'A VALUES CTE is a tiny inline table you can join to within the statement.' },
    ],
  },

  // ---------------------------------------------------------------- 12
  {
    id: 'advanced-12',
    goals: [
      'Understand the MERGE idea: insert new rows, update changed rows, optionally delete missing ones',
      'Write an UPSERT in SQLite with INSERT ... ON CONFLICT DO UPDATE',
      'Use excluded.col to refer to the incoming row',
      'Preview merge actions with a SELECT before running them',
    ],
    concept: `<p>Loading data from another system usually means: <b>new</b> rows must be inserted, <b>existing</b> rows must be updated, and sometimes rows missing from the source must be deleted. <code>MERGE</code> does all of this in one statement (SQL Server, Oracle, PostgreSQL 15+).</p>
<p>SQLite has no MERGE, but it has <b>UPSERT</b>: <code>INSERT ... ON CONFLICT(key) DO UPDATE SET ...</code>. When the insert would violate the unique key, SQLite updates the existing row instead. Inside the UPDATE, <code>excluded.col</code> is the value from the row you tried to insert.</p>
<p>Here a payor contract file arrives: Aetna's rate changed (update), a new payor Humana Gold appears (insert).</p>`,
    why: 'Syncing reference data (payors, fee schedules, patient demographics) from outside systems is a daily task. One statement is safer and faster than check-then-insert-or-update code.',
    when: 'Use it when loading a staging table into a target table, applying a fee schedule update, or syncing a master list.',
    analogy: 'Updating the clinic\'s insurance binder from a new contract list: replace the page if the payer is already in the binder, add a new page if not.',
    exampleSql: `SELECT payor_id, payor_name, payor_type, phone, contract_rate FROM payors ORDER BY payor_id`,
    syntax: `INSERT INTO target (key, col1, col2)
SELECT key, col1, col2 FROM staging WHERE true
ON CONFLICT(key) DO UPDATE SET
  col1 = excluded.col1,
  col2 = excluded.col2
WHERE target.col1 IS NOT excluded.col1;   -- optional: skip no-op updates`,
    sql: `INSERT INTO payors (payor_id, payor_name, payor_type, phone, contract_rate, is_active)
SELECT column1, column2, column3, column4, column5, column6
FROM (VALUES
  (2, 'Aetna Care',  'Commercial', NULL,           0.77, 1),
  (8, 'Humana Gold', 'Medicare',   '800-555-0108', 0.70, 1)
)
WHERE true
ON CONFLICT(payor_id) DO UPDATE SET
  contract_rate = excluded.contract_rate,
  phone         = COALESCE(excluded.phone, payors.phone),
  is_active     = excluded.is_active;

SELECT payor_id, payor_name, phone, contract_rate FROM payors ORDER BY payor_id;`,
    breakdown: [
      ['INSERT INTO payors (...) SELECT ... FROM (VALUES ...)', 'The incoming contract rows (a staging set).'],
      ['WHERE true', 'Required by SQLite\'s parser when an INSERT ... SELECT is followed by ON CONFLICT.'],
      ['ON CONFLICT(payor_id) DO UPDATE SET', 'If payor_id already exists, update instead of failing.'],
      ['contract_rate = excluded.contract_rate', 'excluded is the row we tried to insert: take its new rate.'],
      ['phone = COALESCE(excluded.phone, payors.phone)', 'Keep the existing phone when the file has no phone.'],
    ],
    visual: { type: 'dml', statement: `INSERT INTO payors (payor_id, payor_name, payor_type, phone, contract_rate, is_active)
SELECT column1, column2, column3, column4, column5, column6
FROM (VALUES (2, 'Aetna Care', 'Commercial', NULL, 0.77, 1), (8, 'Humana Gold', 'Medicare', '800-555-0108', 0.70, 1))
WHERE true
ON CONFLICT(payor_id) DO UPDATE SET contract_rate = excluded.contract_rate, phone = COALESCE(excluded.phone, payors.phone), is_active = excluded.is_active`, view: `SELECT payor_id, payor_name, phone, contract_rate FROM payors`, key: 'payor_id' },
    internals: `<p>SQLite tries the insert. When a UNIQUE or PRIMARY KEY constraint named in ON CONFLICT fails, it runs the DO UPDATE against the conflicting row instead. It all happens row by row inside one statement, so it is atomic. The conflict target must match a unique index exactly.</p>`,
    mistakes: [
      { wrong: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate)
SELECT 2, 'Aetna Care', 'Commercial', 0.77 FROM payors
ON CONFLICT(payor_id) DO UPDATE SET contract_rate = excluded.contract_rate;`, why: 'Two problems: SELECT ... FROM payors returns one row per payor (7 conflicting rows), and without WHERE true SQLite cannot parse ON CONFLICT after a SELECT with FROM.', fix: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate)
SELECT 2, 'Aetna Care', 'Commercial', 0.77 WHERE true
ON CONFLICT(payor_id) DO UPDATE SET contract_rate = excluded.contract_rate;` },
      { wrong: `INSERT OR REPLACE INTO payors (payor_id, payor_name, payor_type, contract_rate) VALUES (2, 'Aetna Care', 'Commercial', 0.77);`, why: 'REPLACE deletes the old row and inserts a new one: every column not listed (phone, is_active) is reset to its default or NULL.', fix: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate) VALUES (2, 'Aetna Care', 'Commercial', 0.77)
ON CONFLICT(payor_id) DO UPDATE SET contract_rate = excluded.contract_rate;` },
    ],
    rules: [
      'The conflict target must be a PRIMARY KEY or UNIQUE column set.',
      'excluded.col = the incoming value; table.col = the current value.',
      'INSERT ... SELECT ... ON CONFLICT needs a WHERE clause (WHERE true) in SQLite.',
      'Avoid INSERT OR REPLACE for updates: it deletes and re-inserts.',
      'Deleting rows missing from the source is a separate DELETE in SQLite.',
    ],
    compare: `<table><tr><th>Database</th><th>Syntax</th></tr>
<tr><td>SQLite / PostgreSQL</td><td>INSERT ... ON CONFLICT (key) DO UPDATE / DO NOTHING</td></tr>
<tr><td>MySQL</td><td>INSERT ... ON DUPLICATE KEY UPDATE</td></tr>
<tr><td>SQL Server / Oracle / PostgreSQL 15+</td><td>MERGE INTO target USING source ON ... WHEN MATCHED / WHEN NOT MATCHED</td></tr></table>`,
    realWorld: 'Nightly payer contract syncs, CPT fee schedule updates, and patient demographic feeds from registration systems all use MERGE or UPSERT.',
    deep: `<p>SQL Server's MERGE has known edge cases (race conditions without <code>HOLDLOCK</code>, trigger surprises), so many teams still write separate UPDATE and INSERT statements in a transaction. PostgreSQL 17 adds <code>MERGE ... RETURNING</code> and <code>WHEN NOT MATCHED BY SOURCE</code>.</p>`,
    dialectSql: {
      sqlserver: `MERGE payors WITH (HOLDLOCK) AS t
USING payor_staging AS s ON t.payor_id = s.payor_id
WHEN MATCHED AND t.contract_rate <> s.contract_rate THEN
  UPDATE SET contract_rate = s.contract_rate
WHEN NOT MATCHED BY TARGET THEN
  INSERT (payor_id, payor_name, payor_type, phone, contract_rate, is_active)
  VALUES (s.payor_id, s.payor_name, s.payor_type, s.phone, s.contract_rate, 1)
WHEN NOT MATCHED BY SOURCE THEN
  UPDATE SET is_active = 0;`,
      postgres: `INSERT INTO payors AS t (payor_id, payor_name, payor_type, phone, contract_rate, is_active)
SELECT * FROM payor_staging
ON CONFLICT (payor_id) DO UPDATE
SET contract_rate = EXCLUDED.contract_rate
WHERE t.contract_rate IS DISTINCT FROM EXCLUDED.contract_rate;`,
      mysql: `INSERT INTO payors (payor_id, payor_name, payor_type, phone, contract_rate, is_active)
SELECT * FROM payor_staging
ON DUPLICATE KEY UPDATE contract_rate = VALUES(contract_rate);`,
      oracle: `MERGE INTO payors t
USING payor_staging s ON (t.payor_id = s.payor_id)
WHEN MATCHED THEN UPDATE SET t.contract_rate = s.contract_rate
WHEN NOT MATCHED THEN INSERT (payor_id, payor_name, payor_type, contract_rate, is_active)
  VALUES (s.payor_id, s.payor_name, s.payor_type, s.contract_rate, 1);`,
    },
    tryIt: {
      prompt: 'Upsert with DO NOTHING: insert payors 7 and 9, but silently skip any that already exist. Check which rows changed.',
      starter: `INSERT INTO payors (payor_id, payor_name, payor_type, contract_rate)
VALUES (7, 'Self-Pay', 'Self-Pay', 1.0), (9, 'Tricare West', 'Commercial', 0.72)
ON CONFLICT(payor_id) DO NOTHING;

SELECT payor_id, payor_name, contract_rate FROM payors ORDER BY payor_id;`,
    },
    challenge: {
      level: 3,
      prompt: 'Before running a merge, preview it. A staging list (payor_id, contract_rate) holds (1, 0.80), (2, 0.77), (5, 0.90), (8, 0.70). Return payor_id, the new rate, the current rate (NULL if none) and the action: INSERT (payor not found), UPDATE (rate differs) or NO CHANGE. Order by payor_id.',
      solution: `WITH staging(payor_id, contract_rate) AS (
  VALUES (1, 0.80), (2, 0.77), (5, 0.90), (8, 0.70)
)
SELECT s.payor_id, s.contract_rate AS new_rate, p.contract_rate AS current_rate,
       CASE WHEN p.payor_id IS NULL THEN 'INSERT'
            WHEN p.contract_rate = s.contract_rate THEN 'NO CHANGE'
            ELSE 'UPDATE' END AS action
FROM staging s
LEFT JOIN payors p ON p.payor_id = s.payor_id
ORDER BY s.payor_id;`,
      hints: [
        'Put the staging rows in a VALUES CTE.',
        'LEFT JOIN payors so staging rows without a match are kept (current rate NULL).',
        'CASE: no match → INSERT; same rate → NO CHANGE; else UPDATE. Check the NULL case first.',
        'Select s.payor_id, s.contract_rate, p.contract_rate, the CASE, ORDER BY s.payor_id.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'In ON CONFLICT DO UPDATE, what does excluded.contract_rate refer to?', options: ['The current value in the table', 'The value from the row you tried to insert', 'A deleted value', 'The default value'], answer: 1, why: 'excluded is the pseudo-row that was rejected by the conflict.' },
      { q: 'Why avoid INSERT OR REPLACE to update rows?', options: ['It is slower', 'It deletes the old row, so columns you did not provide are lost (and delete triggers/cascades fire)', 'It does not work in SQLite', 'It creates duplicates'], answer: 1, why: 'REPLACE = DELETE + INSERT.' },
    ],
  },
  // ---------------------------------------------------------------- 13
  {
    id: 'advanced-13',
    goals: [
      'Write searched CASE expressions with several conditions in the right order',
      'Use CASE inside aggregates, ORDER BY and JOIN conditions',
      'Build business rules (collection priority) as one readable expression',
      'Avoid the NULL and ordering traps of CASE',
    ],
    concept: `<p><code>CASE</code> is SQL's if/else. It checks <code>WHEN</code> conditions <b>top to bottom</b> and returns the result of the <b>first</b> one that is true. If none is true it returns the <code>ELSE</code> value, or NULL if there is no ELSE.</p>
<p>Advanced uses go far beyond labelling a column:</p>
<ul>
<li><b>Business rules</b>: turn status + days late + balance into a collection priority.</li>
<li><b>Inside aggregates</b>: <code>SUM(CASE WHEN ... THEN amount END)</code> for conditional totals.</li>
<li><b>Custom sort order</b>: <code>ORDER BY CASE priority WHEN 'Critical' THEN 1 ... END</code>.</li>
<li><b>Safe math</b>: <code>CASE WHEN total = 0 THEN NULL ELSE paid / total END</code>.</li>
</ul>`,
    why: 'Billing rules are full of conditions. Writing them as CASE keeps the rule in one place, visible and testable, instead of scattered through application code.',
    when: 'Use it whenever a value depends on conditions: tiers, bands, flags, custom sort orders, conditional totals and guarded division.',
    analogy: 'A triage nurse\'s checklist: "Chest pain? Go to red. Otherwise, fever over 39? Go to yellow. Otherwise green." The first matching line decides.',
    exampleSql: `SELECT invoice_id, status, due_date, total_amount FROM invoices WHERE status <> 'Paid' ORDER BY due_date LIMIT 10`,
    syntax: `CASE
  WHEN condition_1 THEN result_1   -- checked first
  WHEN condition_2 THEN result_2
  ELSE default_result               -- optional; NULL if omitted
END`,
    sql: `SELECT invoice_id, status, due_date, total_amount,
       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_past_due,
       CASE
         WHEN status = 'Overdue' AND julianday('2026-09-01') - julianday(due_date) > 90 THEN 'Critical'
         WHEN status = 'Overdue' AND total_amount >= 150 THEN 'High'
         WHEN status = 'Overdue' THEN 'Medium'
         WHEN status = 'Partially Paid' THEN 'Medium'
         ELSE 'Low'
       END AS priority
FROM invoices
WHERE status IN ('Open', 'Overdue', 'Partially Paid')
ORDER BY CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
         total_amount DESC, invoice_id;`,
    breakdown: [
      ['CAST(julianday(...) - julianday(due_date) AS INTEGER)', 'Days past due as of 2026-09-01 (negative = not yet due).'],
      ['WHEN status = \'Overdue\' AND ... > 90 THEN \'Critical\'', 'Most specific rule first: very late overdue invoices.'],
      ['WHEN status = \'Overdue\' AND total_amount >= 150 THEN \'High\'', 'Only reached if the Critical rule did not match.'],
      ['ELSE \'Low\'', 'Everything else (Open invoices).'],
      ['ORDER BY CASE priority WHEN \'Critical\' THEN 1 ... END', 'Custom sort: alphabetical order would put Critical, High, Low, Medium.'],
    ],
    visual: { type: 'flow', steps: [['Overdue and > 90 days late?', 'yes → Critical'], ['Overdue and ≥ 150?', 'yes → High'], ['Overdue or Partially Paid?', 'yes → Medium'], ['otherwise', 'Low']] },
    internals: `<p>CASE is evaluated per row and <b>short-circuits</b>: once a WHEN is true, later WHENs are not evaluated. That makes <code>CASE WHEN total = 0 THEN NULL ELSE paid / total END</code> a safe guard. SQLite lets ORDER BY refer to a SELECT alias (priority), which not all databases allow inside expressions.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id,
  CASE WHEN status = 'Overdue' THEN 'Medium'
       WHEN status = 'Overdue' AND julianday('2026-09-01') - julianday(due_date) > 90 THEN 'Critical'
  END AS priority
FROM invoices;`, why: 'The general rule comes first, so the Critical rule can never be reached. Order WHENs from most specific to most general.', fix: `SELECT invoice_id,
  CASE WHEN status = 'Overdue' AND julianday('2026-09-01') - julianday(due_date) > 90 THEN 'Critical'
       WHEN status = 'Overdue' THEN 'Medium'
  END AS priority
FROM invoices;` },
      { wrong: `SELECT payor_id, CASE payor_id WHEN NULL THEN 'Uninsured' ELSE 'Insured' END FROM invoices;`, why: 'Simple CASE compares with =, and NULL = NULL is never true, so every NULL falls into ELSE.', fix: `SELECT payor_id, CASE WHEN payor_id IS NULL THEN 'Uninsured' ELSE 'Insured' END FROM invoices;` },
    ],
    rules: [
      'First true WHEN wins: put specific rules before general ones.',
      'No ELSE means NULL for unmatched rows.',
      'Use searched CASE (WHEN col IS NULL) to test NULLs.',
      'All branches should return the same type.',
      'CASE in ORDER BY gives any custom sort order.',
    ],
    compare: `<table><tr><th>Form</th><th>Example</th><th>Use</th></tr>
<tr><td>Simple CASE</td><td>CASE status WHEN 'Paid' THEN 1 END</td><td>Equality against one value</td></tr>
<tr><td>Searched CASE</td><td>CASE WHEN total &gt; 500 THEN ... END</td><td>Any condition</td></tr>
<tr><td>IIF(c, a, b)</td><td>IIF(total &gt; 500, 'Large', 'Small')</td><td>Two-way shortcut (SQLite, SQL Server)</td></tr>
<tr><td>COALESCE / NULLIF</td><td>NULLIF(total, 0)</td><td>Shortcuts for common NULL cases</td></tr></table>`,
    realWorld: 'Collections work queues, charge capture edits ("if modifier 25 and E/M code then ..."), payer-specific rules and KPI thresholds (red/amber/green) are CASE expressions.',
    deep: `<p>Large rule sets become hard to maintain inside CASE. A common pattern is a <b>rules table</b> (min_days, max_days, label) joined with <code>BETWEEN</code>, so business users can change bands without editing SQL.</p>`,
    tryIt: {
      prompt: 'Classify invoices into size bands (Small < 100, Medium < 300, Large otherwise) and count them per band with a custom band order.',
      starter: `SELECT CASE WHEN total_amount < 100 THEN 'Small'
            WHEN total_amount < 300 THEN 'Medium'
            ELSE 'Large' END AS band,
       COUNT(*) AS invoices, SUM(total_amount) AS billed
FROM invoices
WHERE status <> 'Void'
GROUP BY band
ORDER BY CASE band WHEN 'Small' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END;`,
    },
    challenge: {
      level: 3,
      prompt: 'For each payor type (invoices with no payor count as \'Uninsured\'), return the payor type, the number of non-void invoices, the amount billed on Overdue invoices (0 if none), and a risk label: \'High\' if overdue amount is more than 30% of billed, \'Watch\' if more than 10%, else \'OK\'. Order by payor type.',
      solution: `SELECT CASE WHEN py.payor_type IS NULL THEN 'Uninsured' ELSE py.payor_type END AS payor_type,
       COUNT(*) AS invoices,
       SUM(CASE WHEN i.status = 'Overdue' THEN i.total_amount ELSE 0 END) AS overdue_amount,
       CASE WHEN SUM(CASE WHEN i.status = 'Overdue' THEN i.total_amount ELSE 0 END) > 0.30 * SUM(i.total_amount) THEN 'High'
            WHEN SUM(CASE WHEN i.status = 'Overdue' THEN i.total_amount ELSE 0 END) > 0.10 * SUM(i.total_amount) THEN 'Watch'
            ELSE 'OK' END AS risk
FROM invoices i
LEFT JOIN payors py ON py.payor_id = i.payor_id
WHERE i.status <> 'Void'
GROUP BY 1
ORDER BY 1;`,
      hints: [
        'LEFT JOIN payors so invoices with NULL payor_id stay; CASE WHEN payor_type IS NULL THEN \'Uninsured\'.',
        'Overdue amount: SUM(CASE WHEN status = \'Overdue\' THEN total_amount ELSE 0 END).',
        'The risk label is a CASE wrapped around aggregates; test the 30% rule before the 10% rule.',
        'Filter Void in WHERE, GROUP BY the payor-type expression, ORDER BY it.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'A row matches the 2nd and 3rd WHEN of a CASE. Which result is returned?', options: ['The 2nd', 'The 3rd', 'Both', 'An error'], answer: 0, why: 'CASE returns the first WHEN that is true.' },
      { q: 'What does CASE return when no WHEN matches and there is no ELSE?', options: ['0', 'An empty string', 'NULL', 'An error'], answer: 2, why: 'The implicit ELSE is NULL.' },
    ],
  },

  // ---------------------------------------------------------------- 14
  {
    id: 'advanced-14',
    goals: [
      'Use SQLite date modifiers: +N days, +N months, start of month, weekday',
      'Compute day differences with julianday',
      'Find month-end, next due date and ages',
      'Know the equivalent functions in other databases',
    ],
    concept: `<p>SQLite has no DATE type: dates are ISO text like <code>'2026-09-01'</code>. Because ISO text sorts correctly, comparisons (<code>&lt;</code>, <code>BETWEEN</code>) just work. For arithmetic, use functions:</p>
<ul>
<li><code>date(d, '+30 days')</code>, <code>date(d, '+1 month')</code>, <code>date(d, 'start of month')</code>, <code>date(d, 'start of month', '+1 month', '-1 day')</code> (month end).</li>
<li><code>julianday(a) - julianday(b)</code> = number of days between two dates.</li>
<li><code>strftime('%Y-%m', d)</code> for grouping keys, <code>strftime('%w', d)</code> for weekday (0 = Sunday).</li>
</ul>
<p>Modifiers are applied <b>left to right</b>, so you can chain them like steps in a recipe.</p>`,
    why: 'Billing is driven by dates: due dates, days past due, days to pay, statement periods, filing deadlines and ages for Medicare eligibility.',
    when: 'Use it for aging, SLA measurement, month-end cut-offs, calendar reports and age calculations.',
    analogy: 'A billing calendar with sticky notes: "start from the invoice date, jump to the first of the month, go forward one month, step back one day" gets you to month end.',
    exampleSql: `SELECT invoice_id, invoice_date, due_date, status FROM invoices ORDER BY invoice_date DESC LIMIT 8`,
    syntax: `date(d, '+N days' | '+N months' | 'start of month' | 'weekday N' | ...)
julianday(end) - julianday(start)     -- days between
strftime('%Y-%m', d)                   -- format / extract`,
    sql: `SELECT invoice_id, invoice_date, due_date,
       date(invoice_date, 'start of month', '+1 month', '-1 day')  AS month_end,
       date(invoice_date, 'weekday 5')                            AS next_friday,
       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_past_due,
       CASE strftime('%w', invoice_date)
         WHEN '0' THEN 'Sun' WHEN '6' THEN 'Sat' ELSE 'Weekday' END AS day_type
FROM invoices
WHERE status = 'Overdue'
ORDER BY days_past_due DESC;`,
    breakdown: [
      ['date(invoice_date, \'start of month\', \'+1 month\', \'-1 day\')', 'Chain of modifiers: first of month → first of next month → one day back = month end.'],
      ['date(invoice_date, \'weekday 5\')', 'Moves forward to the next Friday (or stays if already Friday).'],
      ['julianday(\'2026-09-01\') - julianday(due_date)', 'Julian day numbers are day counts, so subtraction gives days between.'],
      ['strftime(\'%w\', invoice_date)', 'Day of week as text \'0\'..\'6\', Sunday = 0.'],
    ],
    internals: `<p><code>julianday()</code> converts a date to a floating-point number of days since noon on November 24, 4714 BC. Date modifiers are applied to that number internally, then formatted back to text. Month arithmetic normalizes overflow: <code>date('2026-01-31', '+1 month')</code> gives <code>2026-03-03</code> because February 31 rolls over. Use <code>'start of month'</code> first when you need clean month steps.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, due_date - invoice_date AS days FROM invoices;`, why: 'Text minus text converts both to numbers (2025 - 2025 = 0). You get the difference in years, not days.', fix: `SELECT invoice_id, julianday(due_date) - julianday(invoice_date) AS days FROM invoices;` },
      { wrong: `SELECT date('2026-01-31', '+1 month');`, why: 'Returns 2026-03-03 (February has no 31st), not the end of February.', fix: `SELECT date('2026-01-31', 'start of month', '+2 months', '-1 day');` },
    ],
    rules: [
      'Store dates as ISO text YYYY-MM-DD so they sort and compare correctly.',
      'Days between = julianday(end) - julianday(start).',
      'Modifiers apply left to right; use start of month before adding months.',
      'Use a fixed "as of" date in reports so results are reproducible.',
    ],
    compare: `<table><tr><th>Task</th><th>SQLite</th><th>PostgreSQL</th><th>SQL Server</th><th>MySQL</th></tr>
<tr><td>Add 30 days</td><td>date(d,'+30 days')</td><td>d + 30</td><td>DATEADD(day,30,d)</td><td>DATE_ADD(d, INTERVAL 30 DAY)</td></tr>
<tr><td>Days between</td><td>julianday(b)-julianday(a)</td><td>b - a</td><td>DATEDIFF(day,a,b)</td><td>DATEDIFF(b,a)</td></tr>
<tr><td>Month start</td><td>date(d,'start of month')</td><td>date_trunc('month',d)</td><td>DATETRUNC(month,d)</td><td>DATE_FORMAT(d,'%Y-%m-01')</td></tr>
<tr><td>Month end</td><td>date(d,'start of month','+1 month','-1 day')</td><td>date_trunc('month',d) + interval '1 month - 1 day'</td><td>EOMONTH(d)</td><td>LAST_DAY(d)</td></tr></table>`,
    realWorld: 'Timely-filing limits (claims must be filed within 90 or 365 days), prompt-pay rules, aging buckets, statement cycles and patient age checks (65+ for Medicare) are all date math.',
    tryIt: {
      prompt: 'Compute each patient\'s age in whole years as of 2026-09-01. Who is 65 or older?',
      starter: `SELECT patient_id, first_name, last_name, date_of_birth,
       CAST(strftime('%Y', '2026-09-01') AS INTEGER) - CAST(strftime('%Y', date_of_birth) AS INTEGER)
         - (strftime('%m-%d', '2026-09-01') < strftime('%m-%d', date_of_birth)) AS age
FROM patients
ORDER BY age DESC
LIMIT 10;`,
    },
    challenge: {
      level: 3,
      prompt: 'How fast does each payor type pay? For invoices with status Paid, compute days from invoice_date to the LAST payment date. Return payor_type, number of paid invoices and average days to pay rounded to 1 decimal, ordered by average days ascending, then payor_type.',
      solution: `WITH last_pay AS (
  SELECT invoice_id, MAX(payment_date) AS last_payment
  FROM payments GROUP BY invoice_id
)
SELECT py.payor_type,
       COUNT(*) AS paid_invoices,
       ROUND(AVG(julianday(lp.last_payment) - julianday(i.invoice_date)), 1) AS avg_days_to_pay
FROM invoices i
JOIN last_pay lp ON lp.invoice_id = i.invoice_id
JOIN payors py   ON py.payor_id = i.payor_id
WHERE i.status = 'Paid'
GROUP BY py.payor_type
ORDER BY avg_days_to_pay, py.payor_type;`,
      hints: [
        'First find the last payment date per invoice: MAX(payment_date) GROUP BY invoice_id.',
        'Join that to Paid invoices and to payors for payor_type.',
        'Days to pay = julianday(last_payment) - julianday(invoice_date).',
        'AVG it per payor_type, ROUND(..., 1), ORDER BY the average then payor_type.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What does date(\'2026-03-15\', \'start of month\', \'+1 month\', \'-1 day\') return?', options: ['2026-03-31', '2026-04-14', '2026-04-30', '2026-03-01'], answer: 0, why: '2026-03-01 → 2026-04-01 → 2026-03-31.' },
      { q: 'How do you get the number of days between two ISO dates in SQLite?', options: ['b - a', 'DATEDIFF(a, b)', 'julianday(b) - julianday(a)', 'strftime(\'%d\', b - a)'], answer: 2, why: 'julianday turns each date into a day count.' },
    ],
  },

  // ---------------------------------------------------------------- 15
  {
    id: 'advanced-15',
    goals: [
      'Define a cohort: patients grouped by when they first appeared',
      'Find each patient\'s first invoice with MIN() or ROW_NUMBER()',
      'Measure cohort size and lifetime value per cohort',
      'Lay out a cohort × period matrix',
    ],
    concept: `<p>A <b>cohort</b> is a group of people who started at the same time. Here: patients grouped by the <b>quarter of their first invoice</b>.</p>
<p>Cohort analysis compares groups fairly. A patient who arrived last month has had no time to come back; comparing them to a patient from last year is misleading. Cohorts line people up by <i>time since they started</i>.</p>
<p>The recipe:</p>
<ol>
<li>Find each patient's first invoice date (their cohort).</li>
<li>Attach the cohort to every invoice of that patient.</li>
<li>Compute <i>period number</i> = quarters since the cohort quarter.</li>
<li>Aggregate by cohort and period.</li>
</ol>`,
    why: 'Totals hide trends. Cohorts show whether newer patient groups are more or less valuable than older ones, and how value accumulates over time.',
    when: 'Use it for patient lifetime value, payer-contract impact (before/after), new clinic openings, and any "are recent customers behaving differently?" question.',
    analogy: 'Graduating classes: you compare the class of 2025 with the class of 2026 at the same point after graduation, not on the same calendar day.',
    exampleSql: `SELECT patient_id, MIN(invoice_date) AS first_invoice, COUNT(*) AS invoices FROM invoices GROUP BY patient_id ORDER BY first_invoice`,
    syntax: `WITH firsts AS (SELECT person_id, MIN(event_date) AS first_date FROM events GROUP BY person_id)
SELECT cohort_of(first_date) AS cohort, period_between(first_date, event_date) AS period, COUNT(DISTINCT person_id)
FROM events JOIN firsts USING (person_id)
GROUP BY cohort, period;`,
    sql: `WITH firsts AS (
  SELECT patient_id, MIN(invoice_date) AS first_invoice
  FROM invoices WHERE status <> 'Void'
  GROUP BY patient_id
),
tagged AS (
  SELECT i.patient_id, i.total_amount,
         strftime('%Y', f.first_invoice) || '-Q' || ((CAST(strftime('%m', f.first_invoice) AS INTEGER) + 2) / 3) AS cohort,
         (CAST(strftime('%Y', i.invoice_date) AS INTEGER) * 4 + (CAST(strftime('%m', i.invoice_date) AS INTEGER) - 1) / 3)
       - (CAST(strftime('%Y', f.first_invoice) AS INTEGER) * 4 + (CAST(strftime('%m', f.first_invoice) AS INTEGER) - 1) / 3) AS quarter_no
  FROM invoices i JOIN firsts f ON f.patient_id = i.patient_id
  WHERE i.status <> 'Void'
)
SELECT cohort,
       COUNT(DISTINCT patient_id) AS patients,
       SUM(CASE WHEN quarter_no = 0 THEN total_amount ELSE 0 END) AS q0_billed,
       SUM(CASE WHEN quarter_no BETWEEN 1 AND 2 THEN total_amount ELSE 0 END) AS q1_q2_billed,
       SUM(CASE WHEN quarter_no >= 3 THEN total_amount ELSE 0 END) AS q3plus_billed,
       SUM(total_amount) AS lifetime_billed
FROM tagged
GROUP BY cohort
ORDER BY cohort;`,
    breakdown: [
      ['firsts: MIN(invoice_date) GROUP BY patient_id', 'Each patient\'s first invoice date decides their cohort.'],
      ['strftime(\'%Y\', ...) || \'-Q\' || ((month + 2) / 3)', 'Cohort label like 2025-Q1. Integer division maps months 1-3 → 1, 4-6 → 2 ...'],
      ['year * 4 + (month - 1) / 3', 'A running quarter number, so subtracting two gives "quarters since first invoice".'],
      ['SUM(CASE WHEN quarter_no = 0 ...)', 'Pivot the periods into columns: what each cohort billed in its first quarter, next two, and later.'],
    ],
    visual: { type: 'flow', steps: [['invoices', '47 non-void'], ['MIN(invoice_date) per patient', 'cohort = first quarter'], ['tag every invoice', 'cohort + quarter_no'], ['GROUP BY cohort', 'cohort size'], ['pivot by quarter_no', 'cohort × period matrix']] },
    internals: `<p>The expensive step is the join from every event back to its person's first date. On large tables, persist the cohort in a patient attribute table (first_invoice_date) and index invoices by (patient_id, invoice_date), so MIN() per patient is an index seek.</p>`,
    mistakes: [
      { wrong: `SELECT strftime('%Y-%m', invoice_date) AS cohort, COUNT(DISTINCT patient_id)
FROM invoices GROUP BY cohort;`, why: 'This groups every invoice by its own month, so a returning patient is counted in several "cohorts". A cohort must be based on the FIRST date only.', fix: `SELECT strftime('%Y-%m', first_invoice) AS cohort, COUNT(*) AS patients
FROM (SELECT patient_id, MIN(invoice_date) AS first_invoice FROM invoices GROUP BY patient_id)
GROUP BY cohort;` },
    ],
    rules: [
      'A person belongs to exactly one cohort: the period of their first event.',
      'Measure time as periods since the cohort start, not calendar dates.',
      'Recent cohorts have fewer periods of history: do not compare incomplete periods.',
      'Decide how to treat duplicates (patient 25 = patient 1) before building cohorts.',
    ],
    compare: `<table><tr><th>Analysis</th><th>Question</th></tr>
<tr><td>Cohort analysis</td><td>How do groups that started at the same time behave?</td></tr>
<tr><td>Retention analysis</td><td>What share of each cohort comes back in later periods?</td></tr>
<tr><td>Time series</td><td>How does one total change over calendar time?</td></tr>
<tr><td>Funnel</td><td>How many move from step 1 to step 2 to step 3?</td></tr></table>`,
    realWorld: 'Practices track lifetime revenue of patients acquired through a new clinic, telehealth launch or marketing campaign; payers track member cohorts after plan changes.',
    deep: `<p>Note that patient 25 is a duplicate of patient 1. Real cohort work first resolves identities (a master patient index), otherwise one person appears as two "new" patients in different cohorts.</p>`,
    tryIt: {
      prompt: 'Show each patient with their cohort month and number of invoices. Change the cohort to the first invoice YEAR.',
      starter: `SELECT patient_id,
       strftime('%Y-%m', MIN(invoice_date)) AS cohort_month,
       COUNT(*) AS invoices,
       SUM(total_amount) AS billed
FROM invoices
WHERE status <> 'Void'
GROUP BY patient_id
ORDER BY cohort_month, patient_id;`,
    },
    challenge: {
      level: 3,
      prompt: 'Cohort by first-invoice YEAR (ignore Void invoices): return cohort year, number of patients, total invoices, lifetime billed, and billed per patient rounded to 2 decimals. Order by cohort year.',
      solution: `WITH firsts AS (
  SELECT patient_id, strftime('%Y', MIN(invoice_date)) AS cohort_year
  FROM invoices WHERE status <> 'Void'
  GROUP BY patient_id
)
SELECT f.cohort_year,
       COUNT(DISTINCT f.patient_id) AS patients,
       COUNT(*) AS invoices,
       SUM(i.total_amount) AS lifetime_billed,
       ROUND(SUM(i.total_amount) * 1.0 / COUNT(DISTINCT f.patient_id), 2) AS billed_per_patient
FROM firsts f
JOIN invoices i ON i.patient_id = f.patient_id AND i.status <> 'Void'
GROUP BY f.cohort_year
ORDER BY f.cohort_year;`,
      hints: [
        'Build a CTE with each patient\'s cohort year: strftime(\'%Y\', MIN(invoice_date)).',
        'Join it back to ALL of that patient\'s non-void invoices.',
        'GROUP BY cohort_year: COUNT(DISTINCT patient_id), COUNT(*), SUM(total_amount).',
        'Billed per patient = SUM(total_amount) * 1.0 / COUNT(DISTINCT patient_id), ROUND to 2.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What defines a patient\'s cohort here?', options: ['Their latest invoice', 'The period of their first invoice', 'Their payor', 'Every month they visited'], answer: 1, why: 'Each person belongs to exactly one cohort based on their first event.' },
      { q: 'Why compare cohorts by "periods since start" instead of calendar months?', options: ['It is faster', 'So every cohort is measured at the same stage of its life', 'Calendar months are not allowed in GROUP BY', 'To avoid NULLs'], answer: 1, why: 'A patient who joined last month cannot be compared with one who joined a year ago on the same calendar day.' },
    ],
  },

  // ---------------------------------------------------------------- 16
  {
    id: 'advanced-16',
    goals: [
      'Aggregate events into a regular time series (monthly billed)',
      'Fill missing periods with a generated calendar',
      'Compute period-over-period change with LAG',
      'Smooth noise with a moving average window frame',
    ],
    concept: `<p>A <b>time series</b> is one number per time period: billed per month, payments per week. Three steps turn raw invoices into a useful series:</p>
<ol>
<li><b>Bucket</b>: group events by period (<code>strftime('%Y-%m', invoice_date)</code>).</li>
<li><b>Fill gaps</b>: months with no invoices must appear as 0, not vanish (a recursive calendar + LEFT JOIN). Our data has no invoices in 2026-02 and 2026-04.</li>
<li><b>Compare</b>: window functions look at neighbouring periods: <code>LAG(billed)</code> for last month, <code>AVG(billed) OVER (ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)</code> for a 3-month moving average.</li>
</ol>`,
    why: 'Trends, seasonality and sudden drops only show up when the data is a regular series with neighbours to compare to.',
    when: 'Use it for monthly revenue reports, cash-flow forecasting, volume monitoring and alerting on unusual drops.',
    analogy: 'A patient\'s vital-signs chart: readings at regular intervals, with the nurse comparing each reading with the previous one and with the trend over the last few.',
    exampleSql: `SELECT strftime('%Y-%m', invoice_date) AS month, COUNT(*) AS invoices, SUM(total_amount) AS billed FROM invoices GROUP BY month ORDER BY month`,
    syntax: `SELECT period, value,
       LAG(value) OVER (ORDER BY period)                                   AS prev_value,
       AVG(value) OVER (ORDER BY period ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg_3
FROM series;`,
    sql: `WITH RECURSIVE months(m) AS (
  SELECT '2025-02-01'
  UNION ALL SELECT date(m, '+1 month') FROM months WHERE m < '2026-08-01'
),
series AS (
  SELECT strftime('%Y-%m', months.m) AS month, TOTAL(i.total_amount) AS billed
  FROM months
  LEFT JOIN invoices i ON strftime('%Y-%m', i.invoice_date) = strftime('%Y-%m', months.m)
  GROUP BY months.m
)
SELECT month, billed,
       billed - LAG(billed) OVER (ORDER BY month)                                   AS change_vs_prev,
       ROUND(AVG(billed) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS moving_avg_3m,
       SUM(billed) OVER (PARTITION BY substr(month, 1, 4) ORDER BY month)           AS ytd_billed
FROM series
ORDER BY month;`,
    breakdown: [
      ['WITH RECURSIVE months(m)', 'A complete calendar: every month from 2025-02 to 2026-08.'],
      ['LEFT JOIN invoices ... TOTAL(i.total_amount)', 'Empty months become 0 instead of disappearing.'],
      ['billed - LAG(billed) OVER (ORDER BY month)', 'Month-over-month change.'],
      ['AVG(...) OVER (ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)', '3-month moving average smooths spikes.'],
      ['SUM(...) OVER (PARTITION BY year ORDER BY month)', 'Year-to-date running total that restarts each January.'],
    ],
    visual: { type: 'window', source: `SELECT strftime('%Y-%m', invoice_date) AS month, SUM(total_amount) AS billed FROM invoices WHERE invoice_date >= '2025-05-01' GROUP BY month ORDER BY month`, partition: null, order: 'month', value: 'billed', fn: 'MOVING_AVG' },
    internals: `<p>Without the calendar, LAG would compare 2026-03 with 2026-01 (skipping February) and call it "previous month". Window functions work on <b>rows</b>, not on dates: <code>ROWS BETWEEN 2 PRECEDING</code> means two rows back, which equals two months back only if every month has a row.</p>`,
    mistakes: [
      { wrong: `SELECT strftime('%Y-%m', invoice_date) AS month, SUM(total_amount) AS billed,
       LAG(SUM(total_amount)) OVER (ORDER BY strftime('%Y-%m', invoice_date)) AS prev
FROM invoices GROUP BY month;`, why: 'Months with no invoices are missing, so for 2026-03 the "previous" row is 2026-01. Fill the calendar first.', fix: `WITH RECURSIVE months(m) AS (SELECT '2025-02-01' UNION ALL SELECT date(m, '+1 month') FROM months WHERE m < '2026-08-01')
SELECT strftime('%Y-%m', m) AS month, TOTAL(i.total_amount) AS billed,
       LAG(TOTAL(i.total_amount)) OVER (ORDER BY m) AS prev
FROM months LEFT JOIN invoices i ON strftime('%Y-%m', i.invoice_date) = strftime('%Y-%m', m)
GROUP BY m;` },
    ],
    rules: [
      'Generate a full calendar before using LAG/LEAD or moving windows.',
      'Use ROWS frames for "last N periods".',
      'Partition running totals by year for YTD.',
      'Label the first period\'s LAG (NULL) sensibly in reports.',
    ],
    compare: `<table><tr><th>Technique</th><th>What it shows</th></tr>
<tr><td>LAG difference</td><td>Change vs previous period</td></tr>
<tr><td>LAG(value, 12)</td><td>Same month last year (with a full calendar)</td></tr>
<tr><td>Moving average</td><td>Smoothed trend</td></tr>
<tr><td>Running SUM</td><td>Cumulative / year-to-date</td></tr></table>`,
    realWorld: 'CFO dashboards show monthly gross charges with MoM change and a rolling 3-month average; revenue-cycle teams alert when weekly collections fall below the moving average.',
    deep: `<p>PostgreSQL has <code>generate_series('2025-02-01'::date, '2026-08-01', interval '1 month')</code> and <code>RANGE BETWEEN INTERVAL '2 months' PRECEDING</code> frames, which work on dates directly and tolerate gaps. SQL Server 2022 adds <code>GENERATE_SERIES</code> and <code>DATE_BUCKET</code>.</p>`,
    tryIt: {
      prompt: 'Build a monthly series of payments collected (payments.payment_date). Add a 3-month moving average.',
      starter: `SELECT strftime('%Y-%m', payment_date) AS month,
       SUM(amount) AS collected,
       ROUND(AVG(SUM(amount)) OVER (ORDER BY strftime('%Y-%m', payment_date) ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg_3m
FROM payments
GROUP BY month
ORDER BY month;`,
    },
    challenge: {
      level: 4,
      prompt: 'For every month of 2026 from January through August (including months with no invoices), return month (YYYY-MM), billed (sum of invoice total_amount, 0 if none), previous month billed (NULL for January) and the change. Order by month.',
      solution: `WITH RECURSIVE months(m) AS (
  SELECT '2026-01-01'
  UNION ALL SELECT date(m, '+1 month') FROM months WHERE m < '2026-08-01'
),
series AS (
  SELECT strftime('%Y-%m', months.m) AS month, TOTAL(i.total_amount) AS billed
  FROM months
  LEFT JOIN invoices i ON strftime('%Y-%m', i.invoice_date) = strftime('%Y-%m', months.m)
  GROUP BY months.m
)
SELECT month, billed,
       LAG(billed) OVER (ORDER BY month) AS prev_billed,
       billed - LAG(billed) OVER (ORDER BY month) AS change
FROM series
ORDER BY month;`,
      hints: [
        'Generate the months 2026-01 .. 2026-08 with a recursive CTE.',
        'LEFT JOIN invoices by month and use TOTAL() (or COALESCE(SUM(...),0)) so empty months show 0.',
        'Put that in a second CTE, then apply LAG(billed) OVER (ORDER BY month).',
        'change = billed - LAG(billed) OVER (ORDER BY month); ORDER BY month.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why generate a calendar before using LAG on monthly totals?', options: ['LAG needs dates', 'Missing months would make LAG compare with the wrong month', 'For performance', 'To remove duplicates'], answer: 1, why: 'LAG looks at the previous ROW, which is only the previous month if every month has a row.' },
      { q: 'Which frame gives a 3-period moving average?', options: ['ROWS BETWEEN 2 PRECEDING AND CURRENT ROW', 'ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING', 'RANGE UNBOUNDED PRECEDING', 'PARTITION BY 3'], answer: 0, why: 'Two previous rows plus the current row = 3 rows.' },
    ],
  },

  // ---------------------------------------------------------------- 17
  {
    id: 'advanced-17',
    goals: [
      'Recognize gap-and-island problems: finding runs of consecutive values',
      'Use the "value minus ROW_NUMBER" trick to label islands',
      'Find streaks of consecutive visit months per patient',
      'Find the gaps (missing months) between islands',
    ],
    concept: `<p>An <b>island</b> is a run of consecutive values with no breaks: a patient who visited in July, August and September. A <b>gap</b> is the missing stretch between islands.</p>
<p>The classic trick: number each patient's visit months in order with <code>ROW_NUMBER()</code>, and turn each month into a running month index (<code>year*12 + month</code>). Then subtract:</p>
<pre>month_index  row_number  difference
  24319          1         24318   ← island A
  24320          2         24318   ← island A
  24326          3         24323   ← island B (a gap broke the run)</pre>
<p>Inside a run, both numbers go up by 1 each step, so the <b>difference stays the same</b>. When there is a gap, the month index jumps but the row number does not, so the difference changes. Group by that difference and every island becomes one group.</p>`,
    why: 'Streaks and breaks matter: consecutive months of care, continuous coverage periods, runs of missed payments, uninterrupted therapy courses.',
    when: 'Use it whenever the question is "find consecutive runs" or "find the missing stretches" in dates or numbers.',
    analogy: 'A physical-therapy punch card: stamps in consecutive months form a streak. When a month is skipped, a new streak starts. Counting months minus stamps tells you which streak each stamp belongs to.',
    exampleSql: `SELECT DISTINCT patient_id, strftime('%Y-%m', invoice_date) AS visit_month FROM invoices WHERE patient_id IN (3, 7) ORDER BY patient_id, visit_month`,
    syntax: `WITH x AS (
  SELECT key, n, n - ROW_NUMBER() OVER (PARTITION BY key ORDER BY n) AS grp
  FROM (SELECT DISTINCT key, n FROM t)
)
SELECT key, MIN(n) AS island_start, MAX(n) AS island_end, COUNT(*) AS length
FROM x GROUP BY key, grp;`,
    sql: `WITH visits AS (
  SELECT DISTINCT patient_id,
         strftime('%Y-%m', invoice_date) AS ym,
         CAST(strftime('%Y', invoice_date) AS INTEGER) * 12 + CAST(strftime('%m', invoice_date) AS INTEGER) AS month_idx
  FROM invoices
),
labeled AS (
  SELECT patient_id, ym, month_idx,
         month_idx - ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY month_idx) AS island_id
  FROM visits
)
SELECT patient_id, MIN(ym) AS streak_start, MAX(ym) AS streak_end, COUNT(*) AS months
FROM labeled
GROUP BY patient_id, island_id
HAVING COUNT(*) >= 2
ORDER BY months DESC, patient_id;`,
    breakdown: [
      ['SELECT DISTINCT patient_id, ... month_idx', 'One row per patient per visit month; year*12 + month turns months into consecutive integers.'],
      ['month_idx - ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY month_idx)', 'Constant within a run of consecutive months, changes after a gap.'],
      ['GROUP BY patient_id, island_id', 'Each island collapses to one row.'],
      ['MIN(ym), MAX(ym), COUNT(*)', 'Start, end and length of the streak.'],
      ['HAVING COUNT(*) >= 2', 'Keep only real streaks (2+ consecutive months).'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 210" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="10" y="18" fill="var(--text)" font-weight="bold">Patient 7: visit months (2025-12 → 2026-08)</text>
<g>
<rect x="10" y="40" width="60" height="34" rx="5" fill="var(--blue)" opacity="0.85"/><text x="40" y="61" fill="var(--text)" text-anchor="middle">Dec</text>
<rect x="80" y="40" width="60" height="34" rx="5" fill="var(--panel2)" stroke="var(--border)" stroke-dasharray="4 3"/><text x="110" y="61" fill="var(--muted)" text-anchor="middle">Jan</text>
<rect x="150" y="40" width="60" height="34" rx="5" fill="var(--panel2)" stroke="var(--border)" stroke-dasharray="4 3"/><text x="180" y="61" fill="var(--muted)" text-anchor="middle">Feb</text>
<rect x="220" y="40" width="60" height="34" rx="5" fill="var(--panel2)" stroke="var(--border)" stroke-dasharray="4 3"/><text x="250" y="61" fill="var(--muted)" text-anchor="middle">Mar</text>
<rect x="290" y="40" width="60" height="34" rx="5" fill="var(--panel2)" stroke="var(--border)" stroke-dasharray="4 3"/><text x="320" y="61" fill="var(--muted)" text-anchor="middle">Apr</text>
<rect x="360" y="40" width="60" height="34" rx="5" fill="var(--panel2)" stroke="var(--border)" stroke-dasharray="4 3"/><text x="390" y="61" fill="var(--muted)" text-anchor="middle">May</text>
<rect x="430" y="40" width="60" height="34" rx="5" fill="var(--green)" opacity="0.85"/><text x="460" y="61" fill="var(--text)" text-anchor="middle">Jun</text>
<rect x="500" y="40" width="60" height="34" rx="5" fill="var(--green)" opacity="0.85"/><text x="530" y="61" fill="var(--text)" text-anchor="middle">Jul</text>
<rect x="570" y="40" width="60" height="34" rx="5" fill="var(--green)" opacity="0.85"/><text x="600" y="61" fill="var(--text)" text-anchor="middle">Aug</text>
</g>
<text x="10" y="98" fill="var(--muted)">month_idx</text>
<text x="40" y="116" fill="var(--text)" text-anchor="middle">24312</text><text x="460" y="116" fill="var(--text)" text-anchor="middle">24318</text><text x="530" y="116" fill="var(--text)" text-anchor="middle">24319</text><text x="600" y="116" fill="var(--text)" text-anchor="middle">24320</text>
<text x="10" y="136" fill="var(--muted)">row_number</text>
<text x="40" y="152" fill="var(--text)" text-anchor="middle">1</text><text x="460" y="152" fill="var(--text)" text-anchor="middle">2</text><text x="530" y="152" fill="var(--text)" text-anchor="middle">3</text><text x="600" y="152" fill="var(--text)" text-anchor="middle">4</text>
<text x="10" y="172" fill="var(--muted)">idx - rn</text>
<text x="40" y="190" fill="var(--blue)" font-weight="bold" text-anchor="middle">24311</text><text x="460" y="190" fill="var(--green)" font-weight="bold" text-anchor="middle">24316</text><text x="530" y="190" fill="var(--green)" font-weight="bold" text-anchor="middle">24316</text><text x="600" y="190" fill="var(--green)" font-weight="bold" text-anchor="middle">24316</text>
<text x="320" y="100" fill="var(--red)" text-anchor="middle">gap: 5 months</text>
<line x1="80" y1="84" x2="420" y2="84" stroke="var(--red)" stroke-width="2"/>
<text x="530" y="205" fill="var(--green)" text-anchor="middle">island: 3 consecutive months</text>
</svg>` },
    internals: `<p>One window pass (a sort by patient and month) and one GROUP BY. The trick needs the sequence to step by exactly 1, which is why months are converted to an integer index. For dates by day use <code>julianday(d) - ROW_NUMBER()</code>. If a patient can have two invoices in the same month, deduplicate first (DISTINCT) or use DENSE_RANK.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id, strftime('%Y-%m', invoice_date) AS ym,
       CAST(strftime('%m', invoice_date) AS INTEGER) - ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY invoice_date) AS grp
FROM invoices;`, why: 'Using only the month number breaks across years (Dec = 12, Jan = 1), and duplicate months in the same patient (two invoices in June) break the step-of-1 rule.', fix: `SELECT patient_id, ym, month_idx - ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY month_idx) AS grp
FROM (SELECT DISTINCT patient_id, strftime('%Y-%m', invoice_date) AS ym,
             CAST(strftime('%Y', invoice_date) AS INTEGER) * 12 + CAST(strftime('%m', invoice_date) AS INTEGER) AS month_idx
      FROM invoices);` },
    ],
    rules: [
      'Convert the sequence to integers that step by exactly 1.',
      'Deduplicate before numbering (DISTINCT) or use DENSE_RANK.',
      'value - ROW_NUMBER() is constant within an island.',
      'Gaps: use LEAD to compare each island end with the next island start.',
    ],
    compare: `<table><tr><th>Approach</th><th>How</th><th>Good for</th></tr>
<tr><td>value - ROW_NUMBER()</td><td>Constant difference per run</td><td>Integer or date sequences</td></tr>
<tr><td>LAG + running SUM of "new run" flags</td><td>Flag breaks, cumulative sum = run id</td><td>Any break rule (gaps &gt; N, status changes)</td></tr>
<tr><td>Recursive CTE</td><td>Walk the sequence row by row</td><td>Small data, complex rules</td></tr></table>`,
    realWorld: 'Continuous insurance coverage checks, consecutive-month therapy programs, runs of missed payments on payment plans, and outage/downtime windows.',
    deep: `<p>The flag-and-sum pattern generalizes: <code>SUM(CASE WHEN month_idx - LAG(month_idx) OVER w &gt; 1 THEN 1 ELSE 0 END) OVER w</code> produces an island number, and you can change the break rule (e.g. allow one missing month) without changing the rest. See the Sessionization lesson.</p>`,
    tryIt: {
      prompt: 'Find the GAPS instead: months across the whole practice with no invoices. Change the calendar range to 2025 only.',
      starter: `WITH RECURSIVE months(m) AS (
  SELECT '2025-02-01' UNION ALL SELECT date(m, '+1 month') FROM months WHERE m < '2026-08-01'
)
SELECT strftime('%Y-%m', m) AS month_without_invoices
FROM months
WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE strftime('%Y-%m', i.invoice_date) = strftime('%Y-%m', months.m));`,
    },
    challenge: {
      level: 4,
      prompt: 'Treat the whole practice as one series: take the distinct months that have at least one invoice and group them into islands of consecutive months. Return island start (YYYY-MM), island end (YYYY-MM), number of months and total billed in the island. Order by island start.',
      solution: `WITH m AS (
  SELECT strftime('%Y-%m', invoice_date) AS ym,
         CAST(strftime('%Y', invoice_date) AS INTEGER) * 12 + CAST(strftime('%m', invoice_date) AS INTEGER) AS month_idx,
         SUM(total_amount) AS billed
  FROM invoices
  GROUP BY 1, 2
),
labeled AS (
  SELECT ym, billed, month_idx - ROW_NUMBER() OVER (ORDER BY month_idx) AS island_id FROM m
)
SELECT MIN(ym) AS island_start, MAX(ym) AS island_end, COUNT(*) AS months, SUM(billed) AS billed
FROM labeled
GROUP BY island_id
ORDER BY island_start;`,
      hints: [
        'First reduce invoices to one row per month with its billed total and a month index (year*12 + month).',
        'The islands are not per patient this time, so ROW_NUMBER() needs no PARTITION BY.',
        'island_id = month_idx - ROW_NUMBER() OVER (ORDER BY month_idx).',
        'GROUP BY island_id: MIN(ym), MAX(ym), COUNT(*), SUM(billed); ORDER BY the start.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why does month_idx - ROW_NUMBER() identify an island?', options: ['It is random', 'Within consecutive months both increase by 1, so the difference stays constant', 'ROW_NUMBER skips gaps', 'It sorts months'], answer: 1, why: 'A gap makes month_idx jump while ROW_NUMBER keeps counting by 1, so the difference changes.' },
      { q: 'Patient 7 has two invoices in June 2026. What must you do before numbering?', options: ['Nothing', 'Deduplicate to one row per month (DISTINCT)', 'Use RANK', 'Delete one invoice'], answer: 1, why: 'Duplicate months break the step-of-1 pattern.' },
    ],
  },

  // ---------------------------------------------------------------- 18
  {
    id: 'advanced-18',
    goals: [
      'Solve "top N per group" with ROW_NUMBER, RANK or DENSE_RANK',
      'Filter window results in an outer query (you cannot use them in WHERE)',
      'Choose a tie policy: exactly N rows or all ties',
      'Add deterministic tie-breakers',
    ],
    concept: `<p><b>Top-N per group</b>: "the 2 biggest charges for each practitioner", "the top patient at each location". LIMIT alone cannot do it, because LIMIT applies to the whole result, not per group.</p>
<p>The pattern:</p>
<ol>
<li>Number rows inside each group with a window: <code>ROW_NUMBER() OVER (PARTITION BY practitioner_id ORDER BY amount DESC, charge_id)</code>.</li>
<li>In an outer query, keep rows with <code>rn &lt;= N</code>.</li>
</ol>
<p>The ranking function sets the <b>tie policy</b>: ROW_NUMBER gives exactly N rows (ties broken by the extra ORDER BY column), RANK and DENSE_RANK keep all tied rows.</p>`,
    why: 'Leaderboards and "top items per category" are among the most common report requests.',
    when: 'Use it for top charges per practitioner, most recent payment per invoice (N = 1), top patients per location, largest balances per payor.',
    analogy: 'Each department posts its own "top 2 procedures of the month" on its own notice board; you rank within each board, not across the whole hospital.',
    exampleSql: `SELECT practitioner_id, charge_id, cpt_code, amount FROM charges WHERE practitioner_id IN (7, 8, 10) ORDER BY practitioner_id, amount DESC`,
    syntax: `SELECT * FROM (
  SELECT t.*, ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY sort_col DESC, id) AS rn
  FROM t
) WHERE rn <= N;`,
    sql: `SELECT practitioner, charge_id, cpt_code, amount, rn
FROM (
  SELECT p.first_name || ' ' || p.last_name AS practitioner,
         c.charge_id, c.cpt_code, c.amount,
         ROW_NUMBER() OVER (PARTITION BY c.practitioner_id
                            ORDER BY c.amount DESC, c.charge_id) AS rn
  FROM charges c
  JOIN practitioners p ON p.practitioner_id = c.practitioner_id
)
WHERE rn <= 2
ORDER BY practitioner, rn;`,
    breakdown: [
      ['ROW_NUMBER() OVER (PARTITION BY c.practitioner_id ...)', 'Numbering restarts at 1 for every practitioner.'],
      ['ORDER BY c.amount DESC, c.charge_id', 'Biggest first; charge_id breaks ties so the result is deterministic.'],
      ['FROM ( ... ) WHERE rn <= 2', 'Window results are computed after WHERE, so filtering must happen in an outer query.'],
      ['ORDER BY practitioner, rn', 'Present each practitioner\'s top 2 together.'],
    ],
    visual: { type: 'window', source: `SELECT practitioner_id, charge_id, cpt_code, amount FROM charges WHERE practitioner_id IN (7, 8, 10) ORDER BY practitioner_id, amount DESC, charge_id`, partition: 'practitioner_id', order: 'amount', value: 'amount', fn: 'ROW_NUMBER' },
    internals: `<p>The engine sorts by (practitioner_id, amount DESC, charge_id), then walks the sorted rows, resetting a counter at each new practitioner. An index on <code>charges(practitioner_id, amount DESC)</code> can remove the sort. Some databases (SQL Server, Postgres) can stop reading a partition early for top-N.</p>`,
    mistakes: [
      { wrong: `SELECT practitioner_id, charge_id, amount,
       ROW_NUMBER() OVER (PARTITION BY practitioner_id ORDER BY amount DESC) AS rn
FROM charges
WHERE rn <= 2;`, why: 'WHERE runs before window functions are computed, so rn does not exist yet.', fix: `SELECT * FROM (
  SELECT practitioner_id, charge_id, amount,
         ROW_NUMBER() OVER (PARTITION BY practitioner_id ORDER BY amount DESC, charge_id) AS rn
  FROM charges
) WHERE rn <= 2;` },
      { wrong: `SELECT practitioner_id, charge_id, amount FROM charges ORDER BY amount DESC LIMIT 2;`, why: 'LIMIT returns the top 2 rows overall, not per practitioner.', fix: `SELECT * FROM (
  SELECT practitioner_id, charge_id, amount,
         ROW_NUMBER() OVER (PARTITION BY practitioner_id ORDER BY amount DESC, charge_id) AS rn
  FROM charges
) WHERE rn <= 2;` },
    ],
    rules: [
      'PARTITION BY the group, ORDER BY the ranking column, then filter outside.',
      'ROW_NUMBER = exactly N rows; RANK/DENSE_RANK = keep ties.',
      'Always add a unique tie-breaker to ORDER BY for ROW_NUMBER.',
      'N = 1 is "latest/biggest per group" (deduplication and latest-record queries).',
    ],
    compare: `<table><tr><th>Amounts</th><th>ROW_NUMBER</th><th>RANK</th><th>DENSE_RANK</th></tr>
<tr><td>380</td><td>1</td><td>1</td><td>1</td></tr>
<tr><td>380</td><td>2</td><td>1</td><td>1</td></tr>
<tr><td>210</td><td>3</td><td>3</td><td>2</td></tr>
<tr><td>95</td><td>4</td><td>4</td><td>3</td></tr></table>`,
    realWorld: 'Top procedures per provider for coding audits, most recent payment per invoice for posting, largest outstanding balances per payer for collectors.',
    deep: `<p>Alternatives: a correlated subquery (<code>WHERE (SELECT COUNT(*) FROM charges c2 WHERE c2.practitioner_id = c.practitioner_id AND c2.amount &gt; c.amount) &lt; 2</code>), <code>CROSS APPLY (SELECT TOP 2 ...)</code> in SQL Server, <code>LATERAL (... LIMIT 2)</code> in Postgres, and <code>QUALIFY rn &lt;= 2</code> in Snowflake/BigQuery/DuckDB.</p>`,
    tryIt: {
      prompt: 'Switch ROW_NUMBER to RANK and to DENSE_RANK with rn <= 1. Which practitioners now return more than one row, and why?',
      starter: `SELECT * FROM (
  SELECT practitioner_id, charge_id, cpt_code, amount,
         RANK() OVER (PARTITION BY practitioner_id ORDER BY amount DESC) AS rnk
  FROM charges
)
WHERE rnk <= 1
ORDER BY practitioner_id, charge_id;`,
    },
    challenge: {
      level: 3,
      prompt: 'For each treatment location, find the top 2 patients by total billed (sum of invoice total_amount at that location). Return location_id, patient_id, billed and rank (1 or 2). Break ties by lower patient_id. Order by location_id, rank.',
      solution: `SELECT location_id, patient_id, billed, rn
FROM (
  SELECT location_id, patient_id, SUM(total_amount) AS billed,
         ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY SUM(total_amount) DESC, patient_id) AS rn
  FROM invoices
  GROUP BY location_id, patient_id
)
WHERE rn <= 2
ORDER BY location_id, rn;`,
      hints: [
        'First aggregate: SUM(total_amount) per (location_id, patient_id).',
        'Window functions can use aggregates: ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY SUM(total_amount) DESC, patient_id).',
        'Wrap it in a subquery and filter rn <= 2 outside.',
        'ORDER BY location_id, rn.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why can\'t you write WHERE rn <= 2 in the same SELECT that computes rn?', options: ['rn is a reserved word', 'WHERE is evaluated before window functions', 'Window functions are not allowed with WHERE', 'You can'], answer: 1, why: 'Logical order: FROM → WHERE → GROUP BY → HAVING → window functions → SELECT → ORDER BY.' },
      { q: 'Which function returns ALL tied rows for "top 1"?', options: ['ROW_NUMBER', 'RANK', 'NTILE', 'LAG'], answer: 1, why: 'RANK gives tied rows the same rank, so all of them have rank 1.' },
    ],
  },

  // ---------------------------------------------------------------- 19
  {
    id: 'advanced-19',
    goals: [
      'Detect duplicate records with GROUP BY ... HAVING COUNT(*) > 1',
      'Choose a "survivor" row with ROW_NUMBER() and flag the rest',
      'Find the duplicate patient (25 = 1) and the duplicate payment',
      'Delete or merge duplicates safely',
    ],
    concept: `<p><b>Duplicates</b> are rows that describe the same real thing more than once. Our data has two famous ones:</p>
<ul>
<li><b>Patient 25</b> is Maria Garcia, born 1951-12-18, just like <b>patient 1</b>: the front desk registered her twice.</li>
<li><b>Payment 47</b> repeats payment 1 on invoice 1 (same date, amount and method): a double-posted cash payment, later reversed by a REFUND.</li>
</ul>
<p>Duplicates have different primary keys, so <code>DISTINCT</code> does not help. You decide which columns define "the same thing" (the <b>match key</b>), then:</p>
<ol>
<li><b>Detect</b>: <code>GROUP BY match key HAVING COUNT(*) &gt; 1</code>.</li>
<li><b>Rank</b>: <code>ROW_NUMBER() OVER (PARTITION BY match key ORDER BY id)</code>. Row 1 is the survivor, rows 2+ are duplicates.</li>
<li><b>Fix</b>: repoint child rows (invoices) to the survivor, then delete or deactivate the extras.</li>
</ol>`,
    why: 'Duplicates inflate patient counts, split a patient\'s history across two records, and double-count money.',
    when: 'Use it after imports, during data-quality checks, before cohort or patient-level analytics, and in payment posting audits.',
    analogy: 'Two paper charts for the same patient in the filing cabinet: you pick the older chart as the master, move the loose pages from the newer one into it, and shred the empty folder.',
    exampleSql: `SELECT patient_id, first_name, last_name, date_of_birth, city, primary_payor_id FROM patients WHERE last_name = 'Garcia'`,
    syntax: `SELECT *, ROW_NUMBER() OVER (PARTITION BY match_col1, match_col2 ORDER BY id) AS rn
FROM t;
-- rn = 1 → survivor, rn > 1 → duplicate`,
    sql: `SELECT patient_id, first_name, last_name, date_of_birth,
       ROW_NUMBER() OVER (PARTITION BY lower(first_name), lower(last_name), date_of_birth
                          ORDER BY patient_id) AS rn,
       FIRST_VALUE(patient_id) OVER (PARTITION BY lower(first_name), lower(last_name), date_of_birth
                                     ORDER BY patient_id) AS survivor_id
FROM patients
WHERE (lower(first_name), lower(last_name), date_of_birth) IN (
  SELECT lower(first_name), lower(last_name), date_of_birth
  FROM patients
  GROUP BY 1, 2, 3
  HAVING COUNT(*) > 1
)
ORDER BY survivor_id, rn;`,
    breakdown: [
      ['GROUP BY lower(first_name), lower(last_name), date_of_birth HAVING COUNT(*) > 1', 'Detect: match keys that occur more than once.'],
      ['WHERE (...) IN (subquery)', 'Row-value IN: keep only patients in a duplicate group.'],
      ['ROW_NUMBER() OVER (PARTITION BY match key ORDER BY patient_id)', 'The oldest record (lowest id) gets rn = 1.'],
      ['FIRST_VALUE(patient_id) OVER (...)', 'Every row learns which id survives, ready for repointing invoices.'],
    ],
    visual: { type: 'flow', steps: [['patients', '25 rows'], ['GROUP BY name + DOB HAVING COUNT(*) > 1', '1 duplicate group'], ['ROW_NUMBER per group', 'rn 1 = survivor (id 1), rn 2 = duplicate (id 25)'], ['UPDATE invoices SET patient_id = 1 WHERE patient_id = 25', 'history merged'], ['DELETE patient 25', 'clean master list']] },
    internals: `<p>Both detection and ranking sort (or hash) by the match key. Normalizing inside the key (<code>lower()</code>, <code>trim()</code>) catches more duplicates but prevents plain index use; production systems store a normalized match key column and index it.</p>`,
    mistakes: [
      { wrong: `SELECT DISTINCT * FROM patients;`, why: 'The duplicates have different patient_id (and different city/email), so the rows are not identical and DISTINCT keeps both.', fix: `SELECT first_name, last_name, date_of_birth, COUNT(*) AS copies
FROM patients GROUP BY first_name, last_name, date_of_birth HAVING COUNT(*) > 1;` },
      { wrong: `DELETE FROM patients WHERE patient_id IN (
  SELECT patient_id FROM patients GROUP BY first_name, last_name, date_of_birth HAVING COUNT(*) > 1);`, why: 'patient_id in a grouped query is an arbitrary member of the group, so you might delete the survivor, and invoices of patient 25 would be orphaned.', fix: `UPDATE invoices SET patient_id = 1 WHERE patient_id = 25;
DELETE FROM patients WHERE patient_id = 25;` },
    ],
    rules: [
      'Define the match key explicitly; primary keys never match.',
      'Pick the survivor with ROW_NUMBER and a deterministic ORDER BY.',
      'Repoint child rows before deleting duplicates.',
      'For money, reverse (REFUND) rather than delete, to keep the audit trail.',
    ],
    compare: `<table><tr><th>Tool</th><th>Finds</th></tr>
<tr><td>DISTINCT</td><td>Rows identical in every selected column</td></tr>
<tr><td>GROUP BY ... HAVING COUNT(*) &gt; 1</td><td>Which match keys are duplicated</td></tr>
<tr><td>ROW_NUMBER() OVER (PARTITION BY key)</td><td>Which specific rows to keep or remove</td></tr>
<tr><td>Self-join a.id &lt; b.id</td><td>Duplicate pairs, also fuzzy matches</td></tr></table>`,
    realWorld: 'Master patient index (MPI) clean-up, duplicate claim detection before submission, and double-posted payment audits are routine in revenue-cycle operations.',
    deep: `<p>Real identity matching is fuzzy: nicknames, typos, swapped day/month. Systems score candidate pairs on several fields (DOB, name similarity, phone, address) and send borderline pairs to a human. SQL does the blocking (candidate pairs on DOB) and the scoring with CASE sums.</p>`,
    tryIt: {
      prompt: 'Merge the duplicate patient in the sandbox: repoint invoices from 25 to 1, delete patient 25, and check patient 1 now has all four invoices.',
      starter: `UPDATE invoices SET patient_id = 1 WHERE patient_id = 25;
DELETE FROM patients WHERE patient_id = 25;
SELECT patient_id, invoice_id, invoice_date, total_amount FROM invoices WHERE patient_id IN (1, 25) ORDER BY invoice_date;`,
    },
    challenge: {
      level: 3,
      prompt: 'Find duplicate payments: payments on the same invoice with the same payment_date, amount, method and payor (NULL payor counts as the patient). Return invoice_id, payment_date, amount, the kept payment_id (lowest) and the duplicate payment_id, ordered by invoice_id, duplicate payment_id.',
      solution: `WITH ranked AS (
  SELECT payment_id, invoice_id, payment_date, amount,
         ROW_NUMBER() OVER (PARTITION BY invoice_id, payment_date, amount, method, COALESCE(payor_id, 0)
                            ORDER BY payment_id) AS rn,
         MIN(payment_id) OVER (PARTITION BY invoice_id, payment_date, amount, method, COALESCE(payor_id, 0)) AS kept_id
  FROM payments
)
SELECT invoice_id, payment_date, amount, kept_id, payment_id AS duplicate_id
FROM ranked
WHERE rn > 1
ORDER BY invoice_id, duplicate_id;`,
      hints: [
        'The match key is invoice_id, payment_date, amount, method and payor.',
        'NULL payors: COALESCE(payor_id, 0) so patient payments group together (PARTITION BY treats NULLs as equal anyway, but be explicit).',
        'ROW_NUMBER() over that partition ORDER BY payment_id; MIN(payment_id) over the same partition is the kept id.',
        'Keep rows with rn > 1 and order by invoice_id, payment_id.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why does SELECT DISTINCT not remove patient 25?', options: ['DISTINCT ignores text', 'Patient 25 has a different patient_id (and other different columns)', 'DISTINCT only works on one column', 'It does remove it'], answer: 1, why: 'DISTINCT compares whole rows; duplicate records differ at least in their key.' },
      { q: 'Before deleting a duplicate patient, what must happen?', options: ['Nothing', 'Repoint child rows (invoices) to the survivor', 'Drop the invoices table', 'Rebuild indexes'], answer: 1, why: 'Otherwise invoices would point to a patient that no longer exists.' },
    ],
  },

  // ---------------------------------------------------------------- 20
  {
    id: 'advanced-20',
    goals: [
      'Group events into sessions separated by inactivity gaps',
      'Flag session starts with LAG and a gap threshold',
      'Number sessions with a running SUM of the flags',
      'Summarize work sessions of each billing user (posted_by)',
    ],
    concept: `<p><b>Sessionization</b> cuts a stream of events into sessions: a new session starts whenever the gap since the previous event of the same user is larger than a threshold.</p>
<p>Here, each human biller (<code>billing.amy</code>, <code>billing.raj</code>) posts transactions. We call it a new work session when more than <b>14 days</b> passed since their previous posting.</p>
<ol>
<li><b>Gap</b>: <code>julianday(date) - julianday(LAG(date))</code> per user.</li>
<li><b>Flag</b>: 1 if the gap is NULL (first event) or &gt; 14, else 0.</li>
<li><b>Session number</b>: running <code>SUM(flag)</code> per user. Every flag = 1 bumps the counter.</li>
<li><b>Summarize</b>: GROUP BY user and session number.</li>
</ol>`,
    why: 'Raw event logs are too granular. Sessions reveal work patterns: how often billers post, how big their batches are, and when backlogs build up.',
    when: 'Use it for user activity logs, portal visits, device readings, or any event stream where "bursts" of activity matter.',
    analogy: 'A biller\'s timesheet: entries close together belong to the same work stretch. If they were away for more than two weeks, the next entry starts a new stretch.',
    exampleSql: `SELECT posted_by, transaction_id, transaction_date, transaction_type, amount FROM transactions WHERE posted_by = 'billing.raj' ORDER BY transaction_date`,
    syntax: `WITH g AS (
  SELECT *, CASE WHEN julianday(ts) - julianday(LAG(ts) OVER w) <= :gap THEN 0 ELSE 1 END AS new_session
  FROM events WINDOW w AS (PARTITION BY user_id ORDER BY ts)
)
SELECT *, SUM(new_session) OVER (PARTITION BY user_id ORDER BY ts) AS session_no FROM g;`,
    sql: `WITH gaps AS (
  SELECT posted_by, transaction_id, transaction_date,
         julianday(transaction_date)
           - julianday(LAG(transaction_date) OVER (PARTITION BY posted_by
                                                   ORDER BY transaction_date, transaction_id)) AS gap_days
  FROM transactions
  WHERE posted_by <> 'system'
),
flagged AS (
  SELECT *, CASE WHEN gap_days IS NULL OR gap_days > 14 THEN 1 ELSE 0 END AS new_session
  FROM gaps
)
SELECT posted_by, transaction_id, transaction_date, gap_days, new_session,
       SUM(new_session) OVER (PARTITION BY posted_by
                              ORDER BY transaction_date, transaction_id) AS session_no
FROM flagged
ORDER BY posted_by, transaction_date, transaction_id;`,
    breakdown: [
      ['WHERE posted_by <> \'system\'', 'Only human billers; automated postings are not work sessions.'],
      ['julianday(date) - julianday(LAG(date) OVER (...))', 'Days since this user\'s previous posting (NULL for their first).'],
      ['CASE WHEN gap_days IS NULL OR gap_days > 14 THEN 1 ELSE 0 END', 'Flag the first posting of each session.'],
      ['SUM(new_session) OVER (PARTITION BY posted_by ORDER BY ...)', 'Running count of flags = session number.'],
    ],
    visual: { type: 'window', source: `SELECT posted_by, transaction_id, transaction_date, CASE WHEN julianday(transaction_date) - julianday(LAG(transaction_date) OVER (PARTITION BY posted_by ORDER BY transaction_date, transaction_id)) <= 14 THEN 0 ELSE 1 END AS new_session FROM transactions WHERE posted_by = 'billing.raj'`, partition: 'posted_by', order: 'transaction_id', value: 'new_session', fn: 'RUNNING_SUM' },
    internals: `<p>Two window passes over the same sort order (posted_by, date, id): one for LAG, one for the running SUM. SQLite cannot nest a window function inside another window function, which is why the flag is computed in one CTE and summed in the next.</p>`,
    mistakes: [
      { wrong: `SELECT posted_by, transaction_date,
       SUM(CASE WHEN julianday(transaction_date) - julianday(LAG(transaction_date) OVER (PARTITION BY posted_by ORDER BY transaction_date)) > 14 THEN 1 ELSE 0 END)
         OVER (PARTITION BY posted_by ORDER BY transaction_date) AS session_no
FROM transactions;`, why: 'Window functions cannot be nested inside other window functions. Compute the flag in a CTE first.', fix: `WITH f AS (
  SELECT posted_by, transaction_id, transaction_date,
         CASE WHEN julianday(transaction_date) - julianday(LAG(transaction_date) OVER (PARTITION BY posted_by ORDER BY transaction_date, transaction_id)) <= 14 THEN 0 ELSE 1 END AS new_session
  FROM transactions)
SELECT posted_by, transaction_date, SUM(new_session) OVER (PARTITION BY posted_by ORDER BY transaction_date, transaction_id) AS session_no FROM f;` },
    ],
    rules: [
      'Partition by the user, order by time plus a unique tie-breaker.',
      'The first event per user (LAG is NULL) always starts a session.',
      'Flag in one step, running-SUM in the next.',
      'The threshold is a business choice: state it in the report.',
    ],
    compare: `<table><tr><th></th><th>Gap-and-island</th><th>Sessionization</th></tr>
<tr><td>Break rule</td><td>Any missing step (gap &gt; 1)</td><td>Gap larger than a threshold</td></tr>
<tr><td>Typical trick</td><td>value - ROW_NUMBER()</td><td>LAG flag + running SUM</td></tr>
<tr><td>Data</td><td>Regular sequences</td><td>Irregular timestamps</td></tr></table>`,
    realWorld: 'Measuring biller productivity and batch posting habits, patient-portal visit sessions, and clustering device telemetry into episodes.',
    tryIt: {
      prompt: 'Change the threshold from 14 to 30 days. How many sessions does billing.amy have now?',
      starter: `WITH f AS (
  SELECT posted_by, transaction_id, transaction_date,
         CASE WHEN julianday(transaction_date) - julianday(LAG(transaction_date) OVER (PARTITION BY posted_by ORDER BY transaction_date, transaction_id)) <= 14 THEN 0 ELSE 1 END AS new_session
  FROM transactions WHERE posted_by <> 'system'
)
SELECT posted_by, SUM(new_session) AS sessions, COUNT(*) AS postings
FROM f GROUP BY posted_by;`,
    },
    challenge: {
      level: 4,
      prompt: 'Summarize each human biller\'s work sessions (new session when more than 14 days since their previous posting; ignore posted_by = \'system\'). Return posted_by, session_no, session start date, session end date and number of postings, ordered by posted_by, session_no.',
      solution: `WITH f AS (
  SELECT posted_by, transaction_id, transaction_date,
         CASE WHEN julianday(transaction_date)
                   - julianday(LAG(transaction_date) OVER (PARTITION BY posted_by ORDER BY transaction_date, transaction_id)) <= 14
              THEN 0 ELSE 1 END AS new_session
  FROM transactions
  WHERE posted_by <> 'system'
),
s AS (
  SELECT *, SUM(new_session) OVER (PARTITION BY posted_by ORDER BY transaction_date, transaction_id) AS session_no
  FROM f
)
SELECT posted_by, session_no, MIN(transaction_date) AS session_start, MAX(transaction_date) AS session_end, COUNT(*) AS postings
FROM s
GROUP BY posted_by, session_no
ORDER BY posted_by, session_no;`,
      hints: [
        'Step 1: LAG(transaction_date) per posted_by to get the gap.',
        'Step 2: flag = 0 if the gap is <= 14 days, else 1 (NULL gap → 1 because the comparison is not true).',
        'Step 3: running SUM of the flag per posted_by = session_no.',
        'Step 4: GROUP BY posted_by, session_no with MIN/MAX dates and COUNT(*).',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What does the running SUM of new_session flags produce?', options: ['The total number of events', 'A session number that increases at each session start', 'The gap in days', 'The last event date'], answer: 1, why: 'Each 1 bumps the counter; the 0s in between keep the same number.' },
      { q: 'Why is CASE WHEN gap <= 14 THEN 0 ELSE 1 END correct for the first event?', options: ['It is not', 'gap is NULL, the comparison is unknown, so ELSE 1 starts a session', 'LAG returns 0', 'The first row is skipped'], answer: 1, why: 'NULL comparisons are never true, so the first row falls to ELSE.' },
    ],
  },

  // ---------------------------------------------------------------- 21
  {
    id: 'advanced-21',
    goals: [
      'Compare each row with the previous/next row using LAG and LEAD',
      'Find consecutive records that share a condition (two overdue invoices in a row)',
      'Measure time between consecutive visits',
      'Understand why a deterministic ORDER BY matters',
    ],
    concept: `<p>"Consecutive records" questions compare a row with its <b>neighbour</b> in some order: "was this patient's previous invoice also overdue?", "how many days since the last visit?", "did the amount go up?"</p>
<p><code>LAG(col)</code> reads a column from the previous row in the window; <code>LEAD(col)</code> reads the next row. With <code>PARTITION BY patient_id ORDER BY invoice_date, invoice_id</code>, "previous" means that patient's previous invoice.</p>
<p>Once the previous values sit on the same row, the question becomes an ordinary <code>WHERE</code>: <code>status = 'Overdue' AND prev_status = 'Overdue'</code>.</p>`,
    why: 'Behaviour is about sequences: repeat late payments, shortening visit intervals and rising charges are signals no single row shows.',
    when: 'Use it for repeat-delinquency flags, visit intervals, change detection (status changed from X to Y) and streak starts.',
    analogy: 'Reading a patient\'s chart page by page and comparing each visit note with the one before it.',
    exampleSql: `SELECT patient_id, invoice_id, invoice_date, status, total_amount FROM invoices WHERE patient_id IN (12, 16) ORDER BY patient_id, invoice_date`,
    syntax: `SELECT *,
       LAG(col)  OVER (PARTITION BY grp ORDER BY ts, id) AS prev_col,
       LEAD(col) OVER (PARTITION BY grp ORDER BY ts, id) AS next_col
FROM t;`,
    sql: `SELECT patient_id, invoice_id, invoice_date, status,
       LAG(invoice_date) OVER w AS prev_invoice_date,
       CAST(julianday(invoice_date) - julianday(LAG(invoice_date) OVER w) AS INTEGER) AS days_since_prev,
       LAG(status) OVER w AS prev_status,
       LEAD(invoice_date) OVER w AS next_invoice_date
FROM invoices
WHERE patient_id IN (3, 7, 12, 16)
WINDOW w AS (PARTITION BY patient_id ORDER BY invoice_date, invoice_id)
ORDER BY patient_id, invoice_date, invoice_id;`,
    breakdown: [
      ['WINDOW w AS (PARTITION BY patient_id ORDER BY invoice_date, invoice_id)', 'A named window reused by every LAG/LEAD: one patient at a time, in date order.'],
      ['LAG(invoice_date) OVER w', 'The patient\'s previous invoice date (NULL for their first).'],
      ['julianday(...) - julianday(LAG(...))', 'Days between consecutive visits.'],
      ['LAG(status) OVER w', 'Previous invoice\'s status, to spot repeat problems.'],
      ['LEAD(invoice_date) OVER w', 'Looks forward: the next invoice date.'],
    ],
    visual: { type: 'window', source: `SELECT patient_id, invoice_id, invoice_date, total_amount FROM invoices WHERE patient_id IN (7, 12, 16) ORDER BY patient_id, invoice_date`, partition: 'patient_id', order: 'invoice_date', value: 'total_amount', fn: 'LAG' },
    internals: `<p>LAG/LEAD are computed in one pass over the partition in window order; the engine keeps a small buffer of previous rows. The named <code>WINDOW</code> clause is not just shorter: the engine knows all functions share one sort.</p>`,
    mistakes: [
      { wrong: `SELECT a.patient_id, a.invoice_id, b.invoice_id AS prev_id
FROM invoices a JOIN invoices b ON b.patient_id = a.patient_id AND b.invoice_id = a.invoice_id - 1;`, why: 'IDs are not in date order per patient (invoice 45 is before 19 for patient 12). "Previous" must come from the date order, not id arithmetic.', fix: `SELECT patient_id, invoice_id,
       LAG(invoice_id) OVER (PARTITION BY patient_id ORDER BY invoice_date, invoice_id) AS prev_id
FROM invoices;` },
      { wrong: `SELECT patient_id, invoice_id, LAG(status) OVER (PARTITION BY patient_id ORDER BY invoice_date) AS prev_status FROM invoices;`, why: 'Patient 7 has invoices on different days, but patient 12 and others could share a date; without a tie-breaker the "previous" row is not guaranteed.', fix: `SELECT patient_id, invoice_id, LAG(status) OVER (PARTITION BY patient_id ORDER BY invoice_date, invoice_id) AS prev_status FROM invoices;` },
    ],
    rules: [
      'Define "previous" with PARTITION BY + ORDER BY, never with id arithmetic.',
      'Add a unique tie-breaker to the ORDER BY.',
      'LAG/LEAD return NULL at the edges; LAG(col, 1, default) supplies a default.',
      'Filter on LAG results in an outer query or CTE.',
    ],
    compare: `<table><tr><th>Function</th><th>Reads</th></tr>
<tr><td>LAG(col, n)</td><td>n rows before</td></tr>
<tr><td>LEAD(col, n)</td><td>n rows after</td></tr>
<tr><td>FIRST_VALUE / LAST_VALUE</td><td>Edges of the frame</td></tr>
<tr><td>Self-join on previous date</td><td>Works everywhere, but slower and harder to write</td></tr></table>`,
    realWorld: 'Collections flags repeat-late payers; care managers watch visit intervals; auditors look for status flips (Paid → Open) that suggest manual edits.',
    tryIt: {
      prompt: 'For each patient, show whether each invoice is bigger or smaller than their previous one. Use LAG(total_amount).',
      starter: `SELECT patient_id, invoice_id, invoice_date, total_amount,
       LAG(total_amount) OVER (PARTITION BY patient_id ORDER BY invoice_date, invoice_id) AS prev_amount,
       CASE WHEN total_amount > LAG(total_amount) OVER (PARTITION BY patient_id ORDER BY invoice_date, invoice_id) THEN 'up'
            WHEN total_amount < LAG(total_amount) OVER (PARTITION BY patient_id ORDER BY invoice_date, invoice_id) THEN 'down'
            ELSE '-' END AS trend
FROM invoices
ORDER BY patient_id, invoice_date;`,
    },
    challenge: {
      level: 3,
      prompt: 'Repeat delinquency: find invoices that are Overdue AND whose same patient\'s previous invoice (by invoice_date, then invoice_id) was also Overdue. Return patient_id, previous invoice_id, invoice_id, and days between the two invoice dates. Order by patient_id, invoice_id.',
      solution: `WITH seq AS (
  SELECT patient_id, invoice_id, invoice_date, status,
         LAG(invoice_id)   OVER w AS prev_invoice_id,
         LAG(invoice_date) OVER w AS prev_date,
         LAG(status)       OVER w AS prev_status
  FROM invoices
  WINDOW w AS (PARTITION BY patient_id ORDER BY invoice_date, invoice_id)
)
SELECT patient_id, prev_invoice_id, invoice_id,
       CAST(julianday(invoice_date) - julianday(prev_date) AS INTEGER) AS days_between
FROM seq
WHERE status = 'Overdue' AND prev_status = 'Overdue'
ORDER BY patient_id, invoice_id;`,
      hints: [
        'Use LAG over a window partitioned by patient_id ordered by invoice_date, invoice_id.',
        'Get the previous invoice_id, invoice_date and status on each row in a CTE.',
        'In the outer query keep status = \'Overdue\' AND prev_status = \'Overdue\'.',
        'days_between = CAST(julianday(invoice_date) - julianday(prev_date) AS INTEGER).',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What does LAG(status) return for a patient\'s first invoice?', options: ['The same status', 'NULL', 'An empty string', 'The previous patient\'s status'], answer: 1, why: 'There is no previous row in that partition, so LAG returns NULL (or its default argument).' },
      { q: 'Why not use invoice_id - 1 to find the previous invoice?', options: ['Subtraction is slow', 'IDs are global and not in per-patient date order', 'IDs can be NULL', 'It works fine'], answer: 1, why: 'Previous must mean the same patient\'s earlier invoice.' },
    ],
  },

  // ---------------------------------------------------------------- 22
  {
    id: 'advanced-22',
    goals: [
      'Compute a running balance on the transactions ledger with SUM() OVER',
      'Understand signed amounts: + raises the balance, - lowers it',
      'Order a ledger deterministically (date, then id)',
      'Find when each invoice was paid off and spot negative balances',
    ],
    concept: `<p>The <code>transactions</code> table is a <b>ledger</b>: every CHARGE adds to what the patient owes (+), every PAYMENT, ADJUSTMENT and WRITE_OFF lowers it (-), and a REFUND puts money back (+).</p>
<p>A <b>running balance</b> is the balance after each entry: the sum of all entries so far. In SQL that is a windowed SUM:</p>
<pre>SUM(amount) OVER (PARTITION BY invoice_id
                  ORDER BY transaction_date, transaction_id)</pre>
<p>With ORDER BY in the window, the default frame is "from the first row up to this row", which is exactly a running total. Look at invoice 1: after the duplicate payment the balance goes <b>negative</b> (-165), then the REFUND brings it back to 0.</p>`,
    why: 'Balances are the heart of billing. A running balance shows not just what is owed now, but how it got there, which is what auditors and patients ask.',
    when: 'Use it for patient statements, invoice histories, account reconciliation and "when was this paid off?" questions.',
    analogy: 'A checkbook register: each line shows the transaction and the balance after it, computed from the line above.',
    exampleSql: `SELECT transaction_id, invoice_id, transaction_date, transaction_type, amount, posted_by FROM transactions WHERE invoice_id IN (1, 6) ORDER BY invoice_id, transaction_date, transaction_id`,
    syntax: `SUM(amount) OVER (
  PARTITION BY account_id
  ORDER BY entry_date, entry_id
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) AS running_balance`,
    sql: `SELECT invoice_id, transaction_id, transaction_date, transaction_type, amount,
       SUM(amount) OVER (PARTITION BY invoice_id
                         ORDER BY transaction_date, transaction_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
FROM transactions
WHERE invoice_id IN (1, 6, 24)
ORDER BY invoice_id, transaction_date, transaction_id;`,
    breakdown: [
      ['PARTITION BY invoice_id', 'Each invoice has its own balance that starts at 0.'],
      ['ORDER BY transaction_date, transaction_id', 'Ledger order; the id breaks ties between entries on the same date.'],
      ['ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'Frame: everything from the first entry to this one.'],
      ['SUM(amount)', 'Signed amounts: charges +, payments/adjustments/write-offs -, refunds +.'],
    ],
    visual: { type: 'window', source: `SELECT invoice_id, transaction_id, transaction_type, amount FROM transactions WHERE invoice_id IN (1, 6, 24) ORDER BY invoice_id, transaction_date, transaction_id`, partition: 'invoice_id', order: 'transaction_id', value: 'amount', fn: 'RUNNING_SUM' },
    internals: `<p>If you leave out the frame, the default with ORDER BY is <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>. RANGE treats rows with equal ORDER BY values as <b>peers</b> and adds them all at once. On invoice 1, the two payments on 2025-05-09 would both be included in each other's balance if you ordered by date only. Use a unique ORDER BY or an explicit ROWS frame.</p>`,
    mistakes: [
      { wrong: `SELECT invoice_id, transaction_id, amount,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date) AS running_balance
FROM transactions WHERE invoice_id = 1;`, why: 'Two payments share the date 2025-05-09. With the default RANGE frame they are peers, so both rows show -165: the intermediate balance of 0 disappears.', fix: `SELECT invoice_id, transaction_id, amount,
       SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
FROM transactions WHERE invoice_id = 1;` },
      { wrong: `SELECT invoice_id, SUM(amount) OVER (ORDER BY transaction_date, transaction_id) AS running_balance FROM transactions;`, why: 'Without PARTITION BY the balance runs across ALL invoices, mixing different accounts.', fix: `SELECT invoice_id, SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id) AS running_balance FROM transactions;` },
    ],
    rules: [
      'Running balance = SUM(signed amount) OVER (PARTITION BY account ORDER BY time, id).',
      'Make the ORDER BY unique or use ROWS, to avoid RANGE peer surprises.',
      'The final running balance must equal the plain SUM per account.',
      'A negative balance means a credit (overpayment) that needs a refund or apply.',
    ],
    compare: `<table><tr><th>Query</th><th>Result</th></tr>
<tr><td>SUM(amount) GROUP BY invoice_id</td><td>Only the final balance</td></tr>
<tr><td>SUM(amount) OVER (PARTITION BY invoice_id ORDER BY ...)</td><td>Balance after every entry</td></tr>
<tr><td>Correlated subquery SUM(... WHERE id &lt;= t.id)</td><td>Same result, O(n²), works without window support</td></tr></table>`,
    realWorld: 'Patient statements list every charge, payment and adjustment with a running balance; accounting systems do the same for every general-ledger account.',
    deep: `<p>Ledgers are append-only: mistakes are corrected with new reversing entries (like the REFUND for the duplicate payment), never by editing old rows. This is why a running balance can dip negative and recover, and why the full history reconciles.</p>`,
    tryIt: {
      prompt: 'Build a practice-wide running A/R balance by date across all invoices (no PARTITION BY). What is the balance at the end?',
      starter: `SELECT transaction_date, transaction_type, amount,
       SUM(amount) OVER (ORDER BY transaction_date, transaction_id
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS ar_balance
FROM transactions
ORDER BY transaction_date DESC, transaction_id DESC
LIMIT 10;`,
    },
    challenge: {
      level: 4,
      prompt: 'Payoff dates: for each invoice whose running ledger balance reached exactly 0 at some point, return invoice_id and the FIRST transaction_date on which the running balance was 0 (round the running balance to 2 decimals before comparing). Order by invoice_id.',
      solution: `WITH ledger AS (
  SELECT invoice_id, transaction_date,
         ROUND(SUM(amount) OVER (PARTITION BY invoice_id
                                 ORDER BY transaction_date, transaction_id
                                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) AS balance
  FROM transactions
)
SELECT invoice_id, MIN(transaction_date) AS paid_off_date
FROM ledger
WHERE balance = 0
GROUP BY invoice_id
ORDER BY invoice_id;`,
      hints: [
        'Compute the running balance per invoice in a CTE with SUM() OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id).',
        'Use an explicit ROWS frame so same-day entries are added one at a time.',
        'ROUND the balance to 2 decimals to avoid floating-point noise.',
        'Keep rows where balance = 0, GROUP BY invoice_id and take MIN(transaction_date).',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Which window gives a running balance per invoice?', options: ['SUM(amount) OVER ()', 'SUM(amount) OVER (PARTITION BY invoice_id)', 'SUM(amount) OVER (PARTITION BY invoice_id ORDER BY transaction_date, transaction_id)', 'SUM(amount) GROUP BY invoice_id'], answer: 2, why: 'ORDER BY inside OVER turns the sum into a cumulative one; PARTITION BY restarts it per invoice.' },
      { q: 'Why add transaction_id to the window ORDER BY?', options: ['Style only', 'To break ties between entries on the same date so each gets its own balance', 'To sort output', 'To avoid NULLs'], answer: 1, why: 'Without a unique order, same-date rows are peers under the default RANGE frame.' },
    ],
  },

  // ---------------------------------------------------------------- 23
  {
    id: 'advanced-23',
    goals: [
      'Measure retention: what share of each cohort comes back later',
      'Compute months since first invoice for every visit',
      'Build a retention matrix (cohort × months since)',
      'Avoid counting the same patient twice in a period',
    ],
    concept: `<p><b>Retention</b> answers: "of the patients who first came in month X, how many came back 1, 2, 3 ... months later?"</p>
<p>It builds on cohorts (lesson "Cohort Analysis"):</p>
<ol>
<li><b>Cohort</b>: each patient's first-invoice month.</li>
<li><b>Activity</b>: every month the patient had an invoice.</li>
<li><b>Offset</b>: months between the cohort month and the activity month (0 = the first month).</li>
<li><b>Count</b> DISTINCT patients per (cohort, offset), and divide by cohort size.</li>
</ol>
<p>With a small data set many cohorts have one or two patients, so percentages jump around; the technique is the same for a million patients.</p>`,
    why: 'Returning patients are the backbone of a practice. Retention shows whether patients come back for follow-up care and whether that is improving.',
    when: 'Use it for follow-up compliance, patient loyalty, subscription or payment-plan continuation, and churn analysis.',
    analogy: 'A class register: each column is a week after enrollment, and you tick every student still attending. The fraction of ticks per column is retention.',
    exampleSql: `SELECT patient_id, strftime('%Y-%m', invoice_date) AS visit_month FROM invoices WHERE patient_id IN (3, 4, 24) ORDER BY patient_id, visit_month`,
    syntax: `WITH first AS (...), activity AS (...)
SELECT cohort, offset, COUNT(DISTINCT person_id) AS active,
       ROUND(100.0 * COUNT(DISTINCT person_id) / cohort_size, 1) AS retention_pct
FROM activity JOIN first USING (person_id)
GROUP BY cohort, offset;`,
    sql: `WITH activity AS (
  SELECT DISTINCT patient_id,
         CAST(strftime('%Y', invoice_date) AS INTEGER) * 12 + CAST(strftime('%m', invoice_date) AS INTEGER) AS month_idx
  FROM invoices WHERE status <> 'Void'
),
cohorts AS (
  SELECT patient_id, MIN(month_idx) AS cohort_idx FROM activity GROUP BY patient_id
)
SELECT printf('%d-%02d', (c.cohort_idx - 1) / 12, (c.cohort_idx - 1) % 12 + 1) AS cohort_month,
       COUNT(DISTINCT c.patient_id) AS cohort_size,
       COUNT(DISTINCT CASE WHEN a.month_idx - c.cohort_idx BETWEEN 1 AND 3 THEN a.patient_id END) AS back_in_1_3m,
       COUNT(DISTINCT CASE WHEN a.month_idx - c.cohort_idx BETWEEN 4 AND 6 THEN a.patient_id END) AS back_in_4_6m,
       COUNT(DISTINCT CASE WHEN a.month_idx - c.cohort_idx > 6 THEN a.patient_id END) AS back_after_6m
FROM cohorts c
JOIN activity a ON a.patient_id = c.patient_id
GROUP BY c.cohort_idx
ORDER BY c.cohort_idx;`,
    breakdown: [
      ['activity: DISTINCT patient_id, month_idx', 'One row per patient per active month (year*12 + month).'],
      ['cohorts: MIN(month_idx)', 'The first active month is the cohort.'],
      ['printf(\'%d-%02d\', ...)', 'Turns the month index back into YYYY-MM.'],
      ['COUNT(DISTINCT CASE WHEN offset BETWEEN 1 AND 3 THEN patient_id END)', 'Patients who came back 1-3 months after their first month (counted once, even with several visits).'],
    ],
    visual: { type: 'flow', steps: [['invoices', 'non-void'], ['activity', 'patient × active month'], ['cohort = MIN(month)', 'per patient'], ['offset = month - cohort', '0, 1, 2 ...'], ['COUNT(DISTINCT patient) per cohort × offset', 'retention matrix']] },
    internals: `<p>COUNT(DISTINCT CASE ...) is a conditional distinct count: the CASE returns NULL for rows outside the bucket, and COUNT ignores NULLs. It is equivalent to a pivot of the (cohort, offset) grid with distinct counts.</p>`,
    mistakes: [
      { wrong: `SELECT strftime('%Y-%m', MIN(invoice_date)) AS cohort, COUNT(*) AS returning
FROM invoices GROUP BY patient_id HAVING COUNT(*) > 1;`, why: 'This counts invoices, not distinct return months, and patient 25/7 with two invoices in the same month would look like a return.', fix: `WITH a AS (SELECT DISTINCT patient_id, strftime('%Y-%m', invoice_date) AS ym FROM invoices)
SELECT patient_id, MIN(ym) AS cohort, COUNT(*) - 1 AS return_months FROM a GROUP BY patient_id;` },
    ],
    rules: [
      'Retention counts DISTINCT people per period, not events.',
      'Offset 0 is the acquisition month (always 100%).',
      'Young cohorts cannot have late offsets yet: do not read missing as zero.',
      'Divide by the cohort size, not by all patients.',
    ],
    compare: `<table><tr><th>Metric</th><th>Formula</th></tr>
<tr><td>Retention (period n)</td><td>active in period n / cohort size</td></tr>
<tr><td>Churn</td><td>1 - retention</td></tr>
<tr><td>Repeat rate</td><td>patients with 2+ visits / all patients</td></tr></table>`,
    realWorld: 'Physical-therapy clinics track how many patients complete a course; primary care tracks annual-wellness return rates; payment-plan teams track plan continuation month by month.',
    tryIt: {
      prompt: 'List each patient with their cohort month and every month offset they were active in. Which patients came back more than 12 months later?',
      starter: `WITH a AS (
  SELECT DISTINCT patient_id,
         CAST(strftime('%Y', invoice_date) AS INTEGER) * 12 + CAST(strftime('%m', invoice_date) AS INTEGER) AS mi
  FROM invoices
)
SELECT patient_id,
       group_concat(mi - (SELECT MIN(mi) FROM a a2 WHERE a2.patient_id = a.patient_id), ',') AS offsets
FROM a
GROUP BY patient_id
ORDER BY patient_id;`,
    },
    challenge: {
      level: 4,
      prompt: 'Retention by first-invoice month (ignore Void invoices): return cohort_month (YYYY-MM), cohort size, the number of those patients with an invoice in any LATER month, and retention % (retained / size × 100, rounded to 1 decimal). Order by cohort_month.',
      solution: `WITH activity AS (
  SELECT DISTINCT patient_id, strftime('%Y-%m', invoice_date) AS ym
  FROM invoices WHERE status <> 'Void'
),
cohorts AS (
  SELECT patient_id, MIN(ym) AS cohort_month FROM activity GROUP BY patient_id
)
SELECT c.cohort_month,
       COUNT(*) AS cohort_size,
       SUM(CASE WHEN EXISTS (SELECT 1 FROM activity a WHERE a.patient_id = c.patient_id AND a.ym > c.cohort_month) THEN 1 ELSE 0 END) AS retained,
       ROUND(100.0 * SUM(CASE WHEN EXISTS (SELECT 1 FROM activity a WHERE a.patient_id = c.patient_id AND a.ym > c.cohort_month) THEN 1 ELSE 0 END) / COUNT(*), 1) AS retention_pct
FROM cohorts c
GROUP BY c.cohort_month
ORDER BY c.cohort_month;`,
      hints: [
        'Reduce invoices to distinct (patient_id, YYYY-MM) activity rows, excluding Void.',
        'Cohort month = MIN(ym) per patient.',
        'A patient is retained if EXISTS an activity row for them with ym > their cohort month.',
        'GROUP BY cohort_month: COUNT(*), SUM(CASE WHEN EXISTS(...) THEN 1 ELSE 0 END), and 100.0 * retained / size rounded to 1.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why count DISTINCT patients in a retention period?', options: ['DISTINCT is faster', 'A patient with 2 visits in one period must count once', 'COUNT(*) ignores NULLs', 'It is not needed'], answer: 1, why: 'Retention is about people, not visits.' },
      { q: 'The newest cohort shows 0% retention. What is the most likely reason?', options: ['Bad care', 'Not enough time has passed for them to return', 'A SQL error', 'Duplicate patients'], answer: 1, why: 'Recent cohorts are right-censored: their later periods have not happened yet.' },
    ],
  },

  // ---------------------------------------------------------------- 24
  {
    id: 'advanced-24',
    goals: [
      'Model a billing funnel: invoiced → partially paid → paid in full',
      'Count how many invoices reach each stage',
      'Compute step and overall conversion rates',
      'Break a funnel down by a dimension (payor type)',
    ],
    concept: `<p>A <b>funnel</b> tracks how many items make it through a sequence of stages. Each stage is a subset of the previous one, so the counts shrink like a funnel.</p>
<p>The revenue funnel for invoices:</p>
<ol>
<li><b>Invoiced</b>: every non-void invoice.</li>
<li><b>Any payment</b>: at least one payment received (partially paid or better).</li>
<li><b>Paid in full</b>: payments add up to the total amount.</li>
</ol>
<p>Compute one row per invoice with a 0/1 flag per stage, then SUM the flags. <b>Step conversion</b> = stage / previous stage; <b>overall conversion</b> = stage / first stage.</p>`,
    why: 'Funnels show where money gets stuck. If many invoices get a first payment but few are paid in full, patient balances after insurance are the problem.',
    when: 'Use it for revenue-cycle stages (claim submitted → accepted → paid), patient journeys (booked → attended → billed), and any staged process.',
    analogy: 'A clinic intake line: everyone checks in, fewer see the nurse, fewer still see the doctor. Counting people at each door tells you where the line stalls.',
    exampleSql: `SELECT i.invoice_id, i.status, i.total_amount, COUNT(p.payment_id) AS payments, TOTAL(p.amount) AS paid
FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.invoice_id
GROUP BY i.invoice_id ORDER BY i.invoice_id LIMIT 10`,
    syntax: `WITH per_item AS (
  SELECT id, 1 AS stage1, CASE WHEN ... THEN 1 ELSE 0 END AS stage2, CASE WHEN ... THEN 1 ELSE 0 END AS stage3
  FROM ...
)
SELECT SUM(stage1), SUM(stage2), SUM(stage3) FROM per_item;`,
    sql: `WITH per_invoice AS (
  SELECT i.invoice_id, i.total_amount,
         COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS paid
  FROM invoices i
  WHERE i.status <> 'Void'
),
stages AS (
  SELECT 1 AS step, 'Invoiced' AS stage, COUNT(*) AS invoices FROM per_invoice
  UNION ALL
  SELECT 2, 'Any payment', SUM(paid > 0) FROM per_invoice
  UNION ALL
  SELECT 3, 'Paid in full', SUM(paid >= total_amount) FROM per_invoice
)
SELECT step, stage, invoices,
       ROUND(100.0 * invoices / LAG(invoices) OVER (ORDER BY step), 1)         AS step_conversion_pct,
       ROUND(100.0 * invoices / FIRST_VALUE(invoices) OVER (ORDER BY step), 1) AS overall_pct
FROM stages
ORDER BY step;`,
    breakdown: [
      ['per_invoice: paid = COALESCE(SUM(payments), 0)', 'One row per non-void invoice with the amount received.'],
      ['SUM(paid > 0)', 'In SQLite a comparison is 1 or 0, so SUM counts matching invoices.'],
      ['UNION ALL of the three stages', 'Unpivots the stage counts into rows, one per funnel step.'],
      ['LAG(invoices) OVER (ORDER BY step)', 'Previous stage count, for step-to-step conversion.'],
      ['FIRST_VALUE(invoices) OVER (ORDER BY step)', 'The top of the funnel, for overall conversion.'],
    ],
    visual: { type: 'flow', steps: [['Invoiced', '47 non-void invoices'], ['Any payment', 'at least one payment received'], ['Paid in full', 'payments ≥ total_amount'], ['conversion', 'stage / previous stage']] },
    internals: `<p>The per-invoice CTE is the key: it reduces payments to one row per invoice before counting, which avoids the "join fan-out" trap where an invoice with two payments is counted twice.</p>`,
    mistakes: [
      { wrong: `SELECT COUNT(*) AS paid_invoices
FROM invoices i JOIN payments p ON p.invoice_id = i.invoice_id;`, why: 'The join produces one row per payment, so invoices with two payments count twice (and invoice 1 with a duplicate payment counts twice too).', fix: `SELECT COUNT(DISTINCT i.invoice_id) AS invoices_with_payment
FROM invoices i JOIN payments p ON p.invoice_id = i.invoice_id;` },
    ],
    rules: [
      'Reduce to one row per item before counting stages.',
      'Each stage should be a subset of the previous one.',
      'Report both step and overall conversion.',
      'Exclude items that should never enter the funnel (Void invoices).',
    ],
    compare: `<table><tr><th>Analysis</th><th>Shape</th></tr>
<tr><td>Funnel</td><td>Stages in order, shrinking counts</td></tr>
<tr><td>Cohort / retention</td><td>Groups over time</td></tr>
<tr><td>Status breakdown</td><td>Counts per status, no ordering</td></tr></table>`,
    realWorld: 'Revenue-cycle KPIs: clean-claim rate (submitted → accepted), first-pass payment rate, and patient-responsibility collection rate are funnel conversions.',
    deep: `<p>Status columns can drift from reality (an invoice marked Paid with no payments). Deriving stages from the facts (payments) rather than from <code>status</code> makes a funnel you can trust; comparing the two is a data-quality check.</p>`,
    tryIt: {
      prompt: 'Compare the derived stages with the status column: count invoices per status and how many of them have any payment.',
      starter: `SELECT i.status, COUNT(*) AS invoices,
       SUM(EXISTS (SELECT 1 FROM payments p WHERE p.invoice_id = i.invoice_id)) AS with_payment
FROM invoices i
GROUP BY i.status
ORDER BY invoices DESC;`,
    },
    challenge: {
      level: 4,
      prompt: 'Funnel by payor type (NULL payor → \'Uninsured\'; ignore Void invoices): return payor_type, invoiced count, count with any payment, count paid in full (payments >= total_amount), and full-payment rate % (paid in full / invoiced × 100, rounded to 1). Order by invoiced descending, then payor_type.',
      solution: `WITH per_invoice AS (
  SELECT COALESCE(py.payor_type, 'Uninsured') AS payor_type, i.total_amount,
         COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id), 0) AS paid
  FROM invoices i
  LEFT JOIN payors py ON py.payor_id = i.payor_id
  WHERE i.status <> 'Void'
)
SELECT payor_type,
       COUNT(*) AS invoiced,
       SUM(CASE WHEN paid > 0 THEN 1 ELSE 0 END) AS any_payment,
       SUM(CASE WHEN paid >= total_amount THEN 1 ELSE 0 END) AS paid_in_full,
       ROUND(100.0 * SUM(CASE WHEN paid >= total_amount THEN 1 ELSE 0 END) / COUNT(*), 1) AS full_pay_rate
FROM per_invoice
GROUP BY payor_type
ORDER BY invoiced DESC, payor_type;`,
      hints: [
        'Build one row per non-void invoice with its payor type (LEFT JOIN payors, COALESCE to \'Uninsured\') and amount paid.',
        'Amount paid: COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.invoice_id), 0).',
        'GROUP BY payor_type: COUNT(*), SUM(CASE WHEN paid > 0 ...), SUM(CASE WHEN paid >= total_amount ...).',
        'Rate = ROUND(100.0 * paid_in_full / COUNT(*), 1). ORDER BY invoiced DESC, payor_type.',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'Why aggregate payments per invoice BEFORE counting funnel stages?', options: ['Style', 'A plain join would count an invoice once per payment', 'SUM does not work in joins', 'To sort the output'], answer: 1, why: 'Join fan-out duplicates invoice rows.' },
      { q: 'Step conversion for "Paid in full" is computed as...', options: ['paid in full / all patients', 'paid in full / any payment', 'any payment / invoiced', 'invoiced / paid in full'], answer: 1, why: 'Step conversion divides by the previous stage.' },
    ],
  },
  // ---------------------------------------------------------------- 25
  {
    id: 'advanced-25',
    goals: [
      'Why timestamps should be stored in UTC and converted only for display',
      'Convert UTC to local time in SQLite with datetime() modifiers and offsets',
      'Handle daylight saving time (DST) without shifting visits to the wrong day',
      'Know timestamptz and AT TIME ZONE in PostgreSQL and other engines',
    ],
    concept: `<p>A <b>timestamp</b> is a moment in time. The same moment has different "wall clock" readings in different places: 19:00 in London (UTC) is 14:00 in Austin in summer.</p>
<p>The golden rule: <b>store in UTC, convert at the edges</b>. Save every timestamp as UTC (or with an explicit offset), and convert to the viewer's local time only when you display it or when a business rule is defined in local time (for example "visits on the clinic's calendar day").</p>
<ul>
<li>SQLite has no time zone type. Timestamps are ISO text like <code>'2026-07-15 19:00:00'</code>, and the date functions treat them as UTC.</li>
<li>Shift by a fixed offset with a modifier: <code>datetime(ts, '-5 hours')</code>.</li>
<li><code>datetime(ts, 'localtime')</code> converts to the time zone <b>of the machine running SQLite</b>, which is rarely what a report wants.</li>
<li>Input with an offset is normalized to UTC: <code>datetime('2026-07-15 14:00:00-05:00')</code> returns <code>2026-07-15 19:00:00</code>.</li>
</ul>
<p>The trap is <b>daylight saving time</b>: Austin is UTC-6 in winter (CST) and UTC-5 in summer (CDT). A fixed offset is only correct for part of the year.</p>`,
    why: 'Billing, claims deadlines and appointment reports depend on "which day did this happen?". A telehealth visit at 9:30 pm in Austin is already the next day in UTC; get the conversion wrong and it is billed on the wrong date.',
    when: 'Whenever data comes from several time zones (telehealth, multi-state clinics, cloud servers in UTC), whenever you group timestamps by local day or month, and whenever you design a column that stores a moment in time.',
    analogy: 'A hospital network keeps one master clock in the server room set to UTC. Each clinic has a wall clock set to local time. Charts are always stamped with the master clock; the front desk translates to the wall clock only when talking to the patient.',
    exampleSql: `SELECT payment_id, payment_date, payment_date || ' 02:30:00' AS recorded_utc, datetime(payment_date || ' 02:30:00', '-5 hours') AS austin_cdt FROM payments WHERE payment_date >= '2026-07-01' ORDER BY payment_id LIMIT 6`,
    syntax: `-- SQLite (values are UTC text)
datetime(ts_utc, '-5 hours')          -- fixed offset
datetime(ts_utc, 'localtime')         -- server's zone (avoid in reports)
datetime('2026-07-15 14:00:00-05:00') -- offset input -> UTC
unixepoch(ts_utc)                     -- seconds since 1970 (UTC)

-- PostgreSQL
ts_utc AT TIME ZONE 'America/Chicago' -- timestamptz -> local wall time`,
    sql: `WITH visits(visit_id, patient_id, visit_utc) AS (
  VALUES (1,  3, '2026-03-07 23:30:00'),   -- winter: CST = UTC-6
         (2,  7, '2026-03-09 15:00:00'),   -- DST started 2026-03-08: CDT = UTC-5
         (3, 12, '2026-07-01 03:15:00'),   -- evening of June 30 in Austin
         (4, 16, '2026-11-02 14:00:00')    -- DST ended 2026-11-01: back to UTC-6
),
tz AS (
  SELECT visit_id, patient_id, visit_utc,
         CASE WHEN visit_utc >= '2026-03-08 08:00:00'
               AND visit_utc <  '2026-11-01 07:00:00' THEN -5 ELSE -6 END AS offset_hours
  FROM visits
)
SELECT visit_id, patient_id, visit_utc, offset_hours,
       datetime(visit_utc, offset_hours || ' hours') AS austin_local,
       date(visit_utc)                               AS utc_date,
       date(visit_utc, offset_hours || ' hours')     AS austin_date
FROM tz
ORDER BY visit_id;`,
    breakdown: [
      ['WITH visits(...) AS (VALUES ...)', 'Four telehealth visits stored in UTC, around both 2026 DST switches.'],
      ["CASE WHEN visit_utc >= '2026-03-08 08:00:00' AND visit_utc < '2026-11-01 07:00:00'", 'US DST for Austin in 2026, written as UTC instants: 2:00 am CST on Mar 8 = 08:00 UTC; 2:00 am CDT on Nov 1 = 07:00 UTC.'],
      ['THEN -5 ELSE -6 END AS offset_hours', 'CDT (summer) is UTC-5; CST (winter) is UTC-6.'],
      ["datetime(visit_utc, offset_hours || ' hours')", "Builds the modifier text '-5 hours' or '-6 hours' and shifts the UTC value to Austin wall time."],
      ["date(visit_utc, offset_hours || ' hours')", 'The local calendar day. Visits 1 and 3 fall on a different day than their UTC date.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 200" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="10" y="20" fill="var(--text)" font-weight="bold">One moment, two clocks</text>
<line x1="40" y1="70" x2="600" y2="70" stroke="var(--blue)" stroke-width="3"/>
<text x="10" y="74" fill="var(--blue)">UTC</text>
<line x1="40" y1="150" x2="600" y2="150" stroke="var(--green)" stroke-width="3"/>
<text x="4" y="154" fill="var(--green)">Austin</text>
<circle cx="420" cy="70" r="6" fill="var(--accent)"/>
<text x="360" y="55" fill="var(--text)">Jul 1, 03:15 UTC</text>
<line x1="420" y1="76" x2="300" y2="144" stroke="var(--accent)" stroke-dasharray="4 3"/>
<circle cx="300" cy="150" r="6" fill="var(--accent)"/>
<text x="230" y="175" fill="var(--text)">Jun 30, 22:15 CDT</text>
<text x="330" y="112" fill="var(--muted)">-5 hours (summer)</text>
<line x1="330" y1="40" x2="330" y2="185" stroke="var(--red)" stroke-dasharray="2 4"/>
<text x="336" y="195" fill="var(--red)">midnight: the calendar day changes</text>
</svg>` },
    dialectSql: {
      sqlite: `SELECT datetime('2026-07-01 03:15:00', '-5 hours') AS austin_local;   -- you supply the offset`,
      postgres: `-- timestamptz stores an absolute instant (internally UTC)
SELECT TIMESTAMPTZ '2026-07-01 03:15:00+00' AT TIME ZONE 'America/Chicago' AS austin_local;
-- DST is handled by the tz database: 2026-06-30 22:15:00`,
      sqlserver: `SELECT CAST('2026-07-01 03:15:00' AS datetime2)
         AT TIME ZONE 'UTC' AT TIME ZONE 'Central Standard Time' AS austin_local;`,
      mysql: `SELECT CONVERT_TZ('2026-07-01 03:15:00', '+00:00', 'America/Chicago') AS austin_local;  -- needs tz tables loaded`,
      oracle: `SELECT FROM_TZ(TIMESTAMP '2026-07-01 03:15:00', 'UTC') AT TIME ZONE 'America/Chicago' AS austin_local FROM dual;`,
    },
    internals: `<p>SQLite's date functions parse the text into a Julian day number (a floating-point count of days) and assume UTC. A trailing offset such as <code>-05:00</code> or <code>Z</code> is applied during parsing, so the result is UTC. The <code>'localtime'</code> modifier asks the operating system's C library for the local offset of the machine running the query, so the same query gives different answers on a laptop in Austin and a server in Frankfurt.</p>
<p>PostgreSQL's <code>timestamptz</code> stores an 8-byte UTC instant and never stores the zone name. On input it converts from the session's <code>TimeZone</code> (or the literal's offset) to UTC; on output it converts back to the session zone. <code>AT TIME ZONE 'America/Chicago'</code> uses the IANA time zone database, which knows every historical DST rule. Plain <code>timestamp</code> (without time zone) is just a wall-clock reading with no zone at all.</p>`,
    mistakes: [
      { wrong: `SELECT date(datetime('2026-07-01 03:15:00', 'localtime')) AS visit_day;`, why: "'localtime' uses the time zone of whatever machine runs the query. The report changes when the server moves or runs in the cloud (usually UTC).", fix: `SELECT date('2026-07-01 03:15:00', '-5 hours') AS visit_day;  -- explicit clinic offset` },
      { wrong: `SELECT '2026-07-15T19:00:00' < '2026-07-15 20:00:00' AS earlier;`, why: "Timestamps are compared as text. 'T' sorts after ' ', so the 19:00 value looks LATER and the result is 0. Mixed formats break range filters.", fix: `SELECT datetime('2026-07-15T19:00:00') < datetime('2026-07-15 20:00:00') AS earlier;` },
      { wrong: `SELECT datetime('2026-01-15 03:00:00', '-5 hours') AS austin_local;`, why: 'January is winter: Austin is UTC-6 (CST), not UTC-5. A fixed summer offset puts every winter visit one hour off, and visits near midnight on the wrong day.', fix: `SELECT datetime('2026-01-15 03:00:00', '-6 hours') AS austin_local;` },
    ],
    rules: [
      'Store moments in UTC (or with an explicit offset); convert only for display or local-day rules.',
      "Never rely on 'localtime' in shared reports: it depends on the server.",
      'Offsets change with DST; a zone name (America/Chicago) is not the same as an offset (-05:00).',
      'Keep one text format (YYYY-MM-DD HH:MM:SS) so text comparison matches time order.',
      'Pure dates (date_of_birth, service_date) have no time zone; do not convert them.',
    ],
    compare: `<table><tr><th>Type / approach</th><th>What it stores</th><th>DST-safe?</th></tr>
<tr><td>SQLite TEXT in UTC</td><td>ISO text, you define it as UTC</td><td>Yes, if you convert with the right offset</td></tr>
<tr><td>PostgreSQL timestamptz</td><td>Absolute instant (UTC)</td><td>Yes, with AT TIME ZONE 'Zone/Name'</td></tr>
<tr><td>PostgreSQL timestamp</td><td>Wall-clock reading, no zone</td><td>No, ambiguous across zones</td></tr>
<tr><td>SQL Server datetimeoffset</td><td>Local time + offset</td><td>Yes for the instant; offset is fixed per value</td></tr>
<tr><td>MySQL TIMESTAMP / DATETIME</td><td>UTC-converted / wall clock</td><td>TIMESTAMP converts via session zone; DATETIME does not</td></tr></table>`,
    realWorld: 'Telehealth platforms record visits in UTC and bill them on the clinic-local date of service. Clearinghouses reject claims whose date of service is "tomorrow", which is exactly what happens when a 10 pm visit is dated in UTC.',
    tips: [
      'Name columns with their zone: visit_utc, created_at_utc.',
      'When you must use offsets in SQLite, keep a small table of DST periods per zone and join to it.',
      'Test conversions with times near midnight and near the DST switch dates.',
    ],
    deep: `<p>DST creates two special hours. In spring, local 02:00-02:59 <b>does not exist</b> (clocks jump to 03:00). In autumn, local 01:00-01:59 <b>happens twice</b>, so a local timestamp like <code>2026-11-01 01:30</code> is ambiguous without an offset. This is why storing local wall time is lossy and why UTC (or local time plus offset) is the only safe storage. Also note that future rules can change by law: store the zone name for future appointments ("3 pm Austin time") and compute the UTC instant close to the date.</p>`,
    tryIt: {
      prompt: "Try the conversions yourself: add a visit at '2026-03-08 07:59:00' and '2026-03-08 08:00:00' (the exact DST switch) and see the offset change. Then compare with the server-dependent 'localtime' modifier.",
      starter: `SELECT '2026-03-08 07:59:00' AS utc, datetime('2026-03-08 07:59:00', '-6 hours') AS cst,
       '2026-03-08 08:00:00' AS utc2, datetime('2026-03-08 08:00:00', '-5 hours') AS cdt,
       datetime('2026-03-08 08:00:00', 'localtime') AS this_machine,
       datetime('2026-07-15 14:00:00-05:00') AS offset_input_to_utc;`,
    },
    challenge: {
      level: 2,
      prompt: "The payment batch job records every payment at 02:30:00 UTC on its payment_date. For payments dated 2026-06-01 through 2026-08-31 (all inside Austin's summer time, UTC-5), return payment_id, the UTC timestamp as text ('YYYY-MM-DD 02:30:00'), and the Austin local date. Order by payment_id.",
      solution: `SELECT payment_id,
       payment_date || ' 02:30:00' AS recorded_utc,
       date(payment_date || ' 02:30:00', '-5 hours') AS austin_date
FROM payments
WHERE payment_date BETWEEN '2026-06-01' AND '2026-08-31'
ORDER BY payment_id;`,
      hints: [
        "Build the UTC timestamp by concatenating: payment_date || ' 02:30:00'.",
        'Summer in Austin is CDT, which is UTC-5.',
        "date(timestamp, '-5 hours') shifts the moment and returns only the local calendar day.",
        "SELECT payment_id, payment_date || ' 02:30:00', date(payment_date || ' 02:30:00', '-5 hours') FROM payments WHERE payment_date BETWEEN '2026-06-01' AND '2026-08-31' ORDER BY payment_id;",
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What is the safest way to store the moment a telehealth visit started?', options: ['Local wall-clock time of the patient', 'UTC (or local time with an explicit offset)', 'The server local time', 'Only the date'], answer: 1, why: 'UTC is unambiguous and DST-free; convert for display.' },
      { q: "What does datetime(ts, 'localtime') use as the target zone in SQLite?", options: ["The clinic's zone", 'UTC', 'The zone of the machine running SQLite', 'The zone stored in the column'], answer: 2, why: 'SQLite asks the operating system, so results depend on where the query runs.' },
      { q: 'Why is a fixed -5 hours offset wrong for an Austin visit in January?', options: ['Austin is UTC-6 in winter (CST)', 'SQLite does not support negative offsets', 'January has no DST rule', 'It is not wrong'], answer: 0, why: 'DST ends in November; winter is UTC-6.' },
    ],
  },

  // ---------------------------------------------------------------- 26
  {
    id: 'advanced-26',
    goals: [
      'Standardize messy text with TRIM, UPPER/LOWER and REPLACE',
      'Turn empty strings and placeholder values into real NULLs with NULLIF',
      'Find invalid values (bad emails, junk cities) before they reach reports',
      'Find duplicate records such as patient 25 vs patient 1 with normalized keys',
      'Apply cleaning safely: SELECT first, then UPDATE',
    ],
    concept: `<p>Real data arrives messy: extra spaces, mixed case, <code>'N/A'</code> typed into a city box, empty strings instead of NULL, phone numbers in five formats. <b>Data cleaning</b> turns these into one standard form so that grouping, joining and de-duplication work.</p>
<p>The core toolkit in SQLite:</p>
<ul>
<li><code>TRIM(x)</code>, <code>LTRIM</code>, <code>RTRIM</code>: remove leading/trailing spaces (or other characters).</li>
<li><code>UPPER(x)</code> / <code>LOWER(x)</code>: one case. Emails are compared in lower case; codes and cities often in upper case.</li>
<li><code>REPLACE(x, '-', '')</code>: remove or swap characters (phone punctuation, double spaces).</li>
<li><code>NULLIF(TRIM(x), '')</code>: an empty or blank string becomes NULL, so "missing" has one meaning.</li>
<li><code>CASE</code>: map placeholders (<code>'N/A'</code>, <code>'UNKNOWN'</code>) and synonyms to standard values.</li>
<li><code>LIKE</code> / <code>GLOB</code> / <code>length()</code>: flag invalid values.</li>
</ul>
<p>The workflow: <b>profile</b> (what is wrong and how often), <b>preview</b> the cleaned values with a SELECT, then <b>apply</b> with an UPDATE (or load into a clean table), and finally <b>re-check</b>.</p>`,
    why: "'Austin', 'austin ' and 'AUSTIN' are three different groups to SQL. Unclean data silently splits totals, breaks joins and hides duplicate patients, which in healthcare can mean split medical and billing histories.",
    when: 'On every import (intake forms, clearinghouse files, spreadsheets), before building reports that group or join on text, and before de-duplicating master data like patients and payors.',
    analogy: 'Before the billing office files paper forms, a clerk straightens each one: crosses out "N/A", writes the city in block capitals, and circles forms whose email has no "@". Only then are they filed, so the right forms end up in the same folder.',
    exampleSql: `SELECT patient_id, first_name, last_name, date_of_birth, city, email FROM patients WHERE patient_id IN (1, 5, 12, 22, 25) ORDER BY patient_id`,
    syntax: `TRIM(col)                       -- strip spaces
UPPER(col) / LOWER(col)         -- one case
REPLACE(col, 'from', 'to')      -- swap characters
NULLIF(TRIM(col), '')           -- blank -> NULL
CASE WHEN UPPER(TRIM(col)) IN ('N/A', 'UNKNOWN') THEN NULL ELSE ... END

UPDATE t SET col = NULLIF(UPPER(TRIM(col)), '');   -- apply after previewing`,
    sql: `WITH raw_intake(intake_id, full_name, city, email, phone) AS (
  VALUES (1, '  maria garcia ', 'austin ',     'Maria.Garcia@MAIL.com ', '(512) 555-0101'),
         (2, 'JOHN SMITH',      'DALLAS',      'john.smith@mail.com',    '512.555.0102'),
         (3, 'Chloe Brown',     'Round  Rock', '',                       '512-555-0103'),
         (4, 'Ava Clark',       ' houston',    'ava.clark@mail',         ''),
         (5, 'Liam Martin',     'N/A',         'LIAM.MARTIN@mail.com',   NULL)
),
cleaned AS (
  SELECT intake_id,
         UPPER(TRIM(full_name))                                   AS name_key,
         CASE WHEN UPPER(TRIM(city)) IN ('', 'N/A', 'UNKNOWN') THEN NULL
              ELSE UPPER(REPLACE(TRIM(city), '  ', ' ')) END       AS city,
         NULLIF(LOWER(TRIM(email)), '')                           AS email,
         NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                phone, '(', ''), ')', ''), ' ', ''), '-', ''), '.', ''), '') AS phone_digits
  FROM raw_intake
)
SELECT intake_id, name_key, city, email, phone_digits,
       CASE WHEN email IS NULL THEN 'missing'
            WHEN email LIKE '%_@_%._%' THEN 'ok'
            ELSE 'invalid' END AS email_check
FROM cleaned
ORDER BY intake_id;`,
    breakdown: [
      ['WITH raw_intake(...) AS (VALUES ...)', 'Five rows as they arrived from a web intake form: spaces, mixed case, placeholders, blanks.'],
      ['UPPER(TRIM(full_name)) AS name_key', 'A normalized key for matching people: no outer spaces, one case.'],
      ["CASE WHEN UPPER(TRIM(city)) IN ('', 'N/A', 'UNKNOWN') THEN NULL", "Placeholders and blanks mean 'unknown', which SQL spells NULL."],
      ["UPPER(REPLACE(TRIM(city), '  ', ' '))", "Trim, collapse the double space in 'Round  Rock', then upper-case."],
      ["NULLIF(LOWER(TRIM(email)), '')", 'Emails in lower case; an empty string becomes NULL.'],
      ["REPLACE(... phone ...)", 'Strip ( ) space - . so every phone is plain digits; blank becomes NULL.'],
      ["email LIKE '%_@_%._%'", "A simple shape check: something@something.something. 'ava.clark@mail' fails."],
    ],
    visual: { type: 'flow', steps: [["'  maria garcia '", 'raw value'], ['TRIM', "'maria garcia'"], ['UPPER', "'MARIA GARCIA'"], ["'' / 'N/A' → NULLIF / CASE", 'placeholders become NULL'], ['LIKE / length checks', 'flag what cannot be fixed automatically'], ['UPDATE after preview', 'standard values stored once']] },
    internals: `<p>Each function works on one value at a time and returns a new string; nothing changes in the table until you run an UPDATE. <code>TRIM</code> removes only spaces by default (<code>TRIM(x, ' .')</code> removes any listed characters). SQLite's <code>UPPER</code>/<code>LOWER</code> only fold ASCII letters unless the ICU extension is loaded, so accented names like 'José' keep their accented characters.</p>
<p>An expression such as <code>UPPER(TRIM(city))</code> in WHERE or GROUP BY cannot use a plain index on <code>city</code>. If you must match on a cleaned key often, store the cleaned value (or create an index on the expression: <code>CREATE INDEX ... ON patients(UPPER(TRIM(city)))</code>).</p>`,
    mistakes: [
      { wrong: `SELECT city, COUNT(*) FROM patients WHERE city <> '' GROUP BY city;`, why: "Blank strings and NULLs are different: city <> '' drops NULL rows silently (NULL <> '' is unknown), and '  ' (spaces) still passes. Normalize first so 'missing' has one meaning.", fix: `SELECT NULLIF(UPPER(TRIM(city)), '') AS city, COUNT(*) FROM patients GROUP BY 1;` },
      { wrong: `UPDATE patients SET email = LOWER(email);  -- run straight on production`, why: 'An UPDATE without a preview is irreversible without a backup. You also miss spaces and blanks. Always SELECT the before and after values first, and wrap the UPDATE in a transaction.', fix: `SELECT patient_id, email AS before_value, NULLIF(LOWER(TRIM(email)), '') AS after_value FROM patients WHERE email IS NOT NULLIF(LOWER(TRIM(email)), '');` },
      { wrong: `SELECT first_name, last_name, COUNT(*) FROM patients GROUP BY first_name, last_name HAVING COUNT(*) > 1;`, why: "Name alone is a weak match (two different Maria Garcias can exist), and it misses 'maria garcia ' written differently. Match on a normalized name plus date_of_birth.", fix: `SELECT UPPER(TRIM(first_name)) AS fn, UPPER(TRIM(last_name)) AS ln, date_of_birth, group_concat(patient_id) AS ids FROM patients GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;` },
    ],
    rules: [
      'Profile, preview, apply, re-check. Never UPDATE blind.',
      "One meaning for 'missing': NULL, not '', 'N/A' or '  '.",
      'Compare text on a normalized key: UPPER(TRIM(x)) or LOWER(TRIM(x)) for emails.',
      "Flag what you cannot fix (invalid emails) instead of guessing.",
      'Clean at the door: constraints and CHECKs stop dirty data from coming back.',
    ],
    compare: `<table><tr><th>Problem</th><th>Detect</th><th>Fix</th></tr>
<tr><td>Extra spaces</td><td><code>col &lt;&gt; TRIM(col)</code></td><td><code>TRIM(col)</code></td></tr>
<tr><td>Mixed case</td><td><code>COUNT(DISTINCT col) &gt; COUNT(DISTINCT UPPER(col))</code></td><td><code>UPPER</code> / <code>LOWER</code></td></tr>
<tr><td>Blank / placeholder</td><td><code>TRIM(col) IN ('', 'N/A')</code></td><td><code>NULLIF</code> / <code>CASE</code></td></tr>
<tr><td>Bad format</td><td><code>NOT LIKE</code> / <code>GLOB</code> / <code>length()</code></td><td>Flag for manual review</td></tr>
<tr><td>Duplicates</td><td><code>GROUP BY normalized key HAVING COUNT(*) &gt; 1</code></td><td>Merge (see Deduplication)</td></tr></table>`,
    realWorld: 'Patient intake imports, payor rosters and clearinghouse remittance files all go through a cleaning step in ETL. Master patient index (MPI) systems normalize names, dates and addresses before matching duplicates like patient 25 and patient 1.',
    tips: [
      "Use GLOB for character classes in SQLite: phone GLOB '[0-9][0-9][0-9]*'.",
      'Keep the raw column and add a cleaned column when you are unsure; you can always re-derive.',
      'Count rows affected by each cleaning rule and log them; auditors will ask.',
    ],
    deep: `<p>Proper case ("Round Rock") is harder than upper case in SQL: <code>UPPER(SUBSTR(x,1,1)) || LOWER(SUBSTR(x,2))</code> only fixes the first word. That is why teams store a normalized <b>key</b> for matching (UPPER, no punctuation) and keep a separate display value. For fuzzy matches (Jon vs John, typos) you need similarity functions (Levenshtein, Soundex, trigram similarity in PostgreSQL's pg_trgm) and a human review step; exact normalized keys are only the first pass.</p>`,
    tryIt: {
      prompt: 'Profile the real patients table: find duplicate people by a normalized key (name + date_of_birth). Patient 25 should show up next to patient 1. Then add city to see which record has the better data.',
      starter: `SELECT UPPER(TRIM(first_name)) || ' ' || UPPER(TRIM(last_name)) AS name_key,
       date_of_birth,
       COUNT(*)                AS copies,
       group_concat(patient_id) AS patient_ids
FROM patients
GROUP BY name_key, date_of_birth
HAVING COUNT(*) > 1;`,
    },
    challenge: {
      mode: 'state',
      level: 3,
      prompt: "Clean the patients table in two steps. (1) Standardize every city: trim it and store it in UPPER CASE, and a city that is empty after trimming becomes NULL. (2) Patient 1 has no city, but its duplicate record, patient 25, does: copy patient 25's city into patient 1 (only if patient 1's city is NULL). Do not delete anything.",
      solution: `UPDATE patients SET city = NULLIF(UPPER(TRIM(city)), '');
UPDATE patients
SET city = (SELECT d.city FROM patients d WHERE d.patient_id = 25)
WHERE patient_id = 1 AND city IS NULL;`,
      check: `SELECT patient_id, city FROM patients ORDER BY patient_id`,
      hints: [
        'Two UPDATE statements: one for all rows, one for patient 1.',
        "Step 1: SET city = NULLIF(UPPER(TRIM(city)), '') for every row (no WHERE needed; NULL stays NULL).",
        'Step 2: SET city = (SELECT city FROM patients WHERE patient_id = 25) with a scalar subquery.',
        "UPDATE patients SET city = NULLIF(UPPER(TRIM(city)), ''); UPDATE patients SET city = (SELECT d.city FROM patients d WHERE d.patient_id = 25) WHERE patient_id = 1 AND city IS NULL;",
      ],
    },
    quiz: [
      { q: "What does NULLIF(TRIM('   '), '') return?", options: ["'   '", "''", 'NULL', '0'], answer: 2, why: "TRIM gives '', and NULLIF returns NULL when both arguments are equal." },
      { q: "Why group duplicates on UPPER(TRIM(last_name)) instead of last_name?", options: ['It is faster', "So 'Garcia', 'GARCIA' and ' garcia' fall into the same group", 'GROUP BY requires upper case', 'To remove NULLs'], answer: 1, why: 'Text comparison is exact; normalizing puts variants in one group.' },
      { q: 'What is the safest order of work for cleaning?', options: ['UPDATE, then check', 'Profile, preview with SELECT, UPDATE, re-check', 'DELETE bad rows first', 'Export to a spreadsheet'], answer: 1, why: 'Preview shows exactly what the UPDATE will do before it is irreversible.' },
    ],
  },

  // ---------------------------------------------------------------- 27
  {
    id: 'advanced-27',
    goals: [
      'The difference between OLTP (running the business) and OLAP (analyzing it)',
      'What a star schema is: one fact table surrounded by dimension tables',
      'Build fact_charges and date, practitioner, location and payor dimensions from the billing tables',
      'Answer roll-up questions (year → quarter → month, subtotals) with simple joins',
    ],
    concept: `<p>The billing database is an <b>OLTP</b> design: normalized tables tuned for many small, fast writes (post a charge, record a payment). Analysts ask different questions: "billed amount by payor type by quarter", "which specialty grew most". Those are <b>OLAP</b> questions: large scans, many groupings, few writes.</p>
<p>A <b>star schema</b> reshapes data for analysis:</p>
<ul>
<li>A <b>fact table</b> in the center: one row per business event at a chosen <b>grain</b> (here: one row per charge line), holding numeric <b>measures</b> (units, amount) and foreign keys.</li>
<li><b>Dimension tables</b> around it: descriptive attributes to filter and group by. <code>dim_date</code> (year, quarter, month), <code>dim_practitioner</code> (name, specialty), <code>dim_location</code> (name, type, city), <code>dim_payor</code> (name, type).</li>
</ul>
<p>Every question becomes the same shape: <b>fact JOIN the dimensions you need, GROUP BY dimension attributes, SUM the measures</b>. A <b>roll-up</b> moves up a hierarchy (month → quarter → year) by grouping on a coarser attribute.</p>`,
    why: 'Analysts should not need to know that a charge reaches its payor through invoices, or how to derive a quarter from a date. The star schema answers those once, so every report is a simple, fast join.',
    when: 'For data warehouses, BI dashboards (Power BI, Tableau, Looker), monthly revenue-cycle reporting, and any time many reports slice the same events by the same attributes.',
    analogy: 'The billing office ledger (OLTP) records each transaction as it happens. For the monthly board meeting, the finance team builds a summary binder: one master sheet of every charge (the fact) with tabbed reference sheets for dates, doctors, clinics and insurers (the dimensions). Any question is answered by flipping between the master sheet and a tab.',
    exampleSql: `SELECT c.charge_id, c.service_date, c.practitioner_id, i.location_id, i.payor_id, c.units, c.amount FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id ORDER BY c.charge_id LIMIT 8`,
    syntax: `CREATE TABLE dim_x AS SELECT key, attribute1, attribute2 FROM source;
CREATE TABLE fact_y AS SELECT event_id, dim_key1, dim_key2, measure1, measure2 FROM ...;

SELECT d.attribute, SUM(f.measure)
FROM fact_y f
JOIN dim_x d ON d.key = f.dim_key1
GROUP BY d.attribute;`,
    sql: `CREATE TABLE dim_date AS
SELECT DISTINCT service_date AS date_key,
       strftime('%Y', service_date) AS year,
       strftime('%Y', service_date) || '-Q' || ((CAST(strftime('%m', service_date) AS INTEGER) + 2) / 3) AS quarter,
       strftime('%Y-%m', service_date) AS month
FROM charges;

CREATE TABLE dim_practitioner AS
SELECT practitioner_id AS practitioner_key, first_name || ' ' || last_name AS practitioner_name, specialty
FROM practitioners;

CREATE TABLE dim_location AS
SELECT location_id AS location_key, location_name, location_type, city
FROM treatment_locations;

CREATE TABLE dim_payor AS
SELECT payor_id AS payor_key, payor_name, payor_type FROM payors
UNION ALL
SELECT -1, 'No payor on file', 'Unknown';          -- "unknown member" row

CREATE TABLE fact_charges AS
SELECT c.charge_id,
       c.service_date               AS date_key,
       c.practitioner_id            AS practitioner_key,
       i.location_id                AS location_key,
       COALESCE(i.payor_id, -1)     AS payor_key,
       c.units, c.amount
FROM charges c
JOIN invoices i ON i.invoice_id = c.invoice_id;

-- A typical OLAP question: billed by year, quarter and payor type
SELECT d.year, d.quarter, p.payor_type,
       COUNT(*)      AS charge_lines,
       SUM(f.amount) AS billed
FROM fact_charges f
JOIN dim_date  d ON d.date_key  = f.date_key
JOIN dim_payor p ON p.payor_key = f.payor_key
GROUP BY d.year, d.quarter, p.payor_type
ORDER BY d.quarter, billed DESC;`,
    breakdown: [
      ['CREATE TABLE dim_date AS SELECT DISTINCT service_date ...', 'Date dimension: one row per date with its year, quarter and month precomputed.'],
      ["((CAST(strftime('%m', ...) AS INTEGER) + 2) / 3)", 'Month 1-3 → 1, 4-6 → 2, and so on (integer division).'],
      ['dim_practitioner / dim_location', 'Descriptive attributes, flattened for easy grouping.'],
      ["UNION ALL SELECT -1, 'No payor on file', 'Unknown'", 'An "unknown member" so charges on invoices with a NULL payor still join.'],
      ['CREATE TABLE fact_charges AS ...', 'The fact: grain = one charge line; keys to every dimension plus the measures units and amount.'],
      ['COALESCE(i.payor_id, -1)', 'Point NULL payors at the unknown member instead of losing them in an inner join.'],
      ['JOIN dim_date ... JOIN dim_payor ... GROUP BY', 'Every analytic question: join the dimensions you need, group, sum.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 260" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<rect x="235" y="95" width="170" height="80" rx="8" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/>
<text x="320" y="115" text-anchor="middle" fill="var(--accent)" font-weight="bold">fact_charges</text>
<text x="320" y="133" text-anchor="middle" fill="var(--text)">date_key, practitioner_key,</text>
<text x="320" y="148" text-anchor="middle" fill="var(--text)">location_key, payor_key</text>
<text x="320" y="165" text-anchor="middle" fill="var(--green)">units, amount</text>
<rect x="20" y="15" width="170" height="60" rx="8" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="105" y="37" text-anchor="middle" fill="var(--blue)" font-weight="bold">dim_date</text>
<text x="105" y="57" text-anchor="middle" fill="var(--text)">year, quarter, month</text>
<rect x="450" y="15" width="170" height="60" rx="8" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="535" y="37" text-anchor="middle" fill="var(--blue)" font-weight="bold">dim_practitioner</text>
<text x="535" y="57" text-anchor="middle" fill="var(--text)">name, specialty</text>
<rect x="20" y="190" width="170" height="60" rx="8" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="105" y="212" text-anchor="middle" fill="var(--blue)" font-weight="bold">dim_location</text>
<text x="105" y="232" text-anchor="middle" fill="var(--text)">name, type, city</text>
<rect x="450" y="190" width="170" height="60" rx="8" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="535" y="212" text-anchor="middle" fill="var(--blue)" font-weight="bold">dim_payor</text>
<text x="535" y="232" text-anchor="middle" fill="var(--text)">name, payor_type</text>
<line x1="190" y1="60" x2="235" y2="105" stroke="var(--muted)" stroke-width="2"/>
<line x1="450" y1="60" x2="405" y2="105" stroke="var(--muted)" stroke-width="2"/>
<line x1="190" y1="205" x2="235" y2="170" stroke="var(--muted)" stroke-width="2"/>
<line x1="450" y1="205" x2="405" y2="170" stroke="var(--muted)" stroke-width="2"/>
</svg>` },
    internals: `<p>OLTP engines (SQLite, PostgreSQL, SQL Server row store) store rows together, which is ideal for reading or writing one invoice. OLAP engines (Snowflake, BigQuery, Redshift, DuckDB, SQL Server columnstore) store each <b>column</b> separately and compressed: a query that sums <code>amount</code> by <code>payor_key</code> reads just those two columns out of billions of rows. Star joins are cheap because dimensions are small; engines build a hash table from each dimension and stream the fact table through them (a "star join"). Dimension filters can even be pushed into the fact scan as bitmap or bloom filters.</p>`,
    mistakes: [
      { wrong: `SELECT p.payor_type, SUM(i.total_amount) AS billed
FROM invoices i JOIN charges c ON c.invoice_id = i.invoice_id
JOIN payors p ON p.payor_id = i.payor_id
GROUP BY p.payor_type;`, why: 'Mixed grain: total_amount is an invoice-level measure, but the rows are charge lines, so each invoice total is counted once per charge (fan-out). Pick one grain for the fact and only use measures of that grain.', fix: `SELECT p.payor_type, SUM(c.amount) AS billed
FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id
JOIN payors p ON p.payor_id = i.payor_id
GROUP BY p.payor_type;` },
      { wrong: `SELECT p.payor_type, SUM(c.amount) AS billed
FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id
JOIN payors p ON p.payor_id = i.payor_id
GROUP BY p.payor_type;  -- misses charges with no payor`, why: 'Invoices with a NULL payor_id drop out of the inner join, so the report total is less than total charges. A warehouse maps missing keys to an "unknown" dimension row.', fix: `SELECT COALESCE(p.payor_type, 'Unknown') AS payor_type, SUM(c.amount) AS billed
FROM charges c JOIN invoices i ON i.invoice_id = c.invoice_id
LEFT JOIN payors p ON p.payor_id = i.payor_id
GROUP BY 1;` },
    ],
    rules: [
      'Declare the grain first: "one row per charge line".',
      'Facts hold keys and additive measures; dimensions hold descriptive text.',
      'Every fact key must find a dimension row: use an "unknown" member, never NULL keys.',
      'Roll up by grouping on a coarser attribute of the same dimension.',
      'OLTP for writing the business, OLAP for analyzing it.',
    ],
    compare: `<table><tr><th></th><th>OLTP (billing app)</th><th>OLAP (warehouse)</th></tr>
<tr><td>Workload</td><td>Many small reads/writes</td><td>Few large scans and aggregations</td></tr>
<tr><td>Design</td><td>Normalized (3NF)</td><td>Star / snowflake, denormalized dimensions</td></tr>
<tr><td>Typical query</td><td>Post payment for invoice 12</td><td>Billed by payor type by quarter</td></tr>
<tr><td>Storage</td><td>Row store</td><td>Column store</td></tr>
<tr><td>History</td><td>Current state</td><td>Full history, snapshots, SCDs</td></tr></table>
<p><b>Snowflake schema</b>: dimensions are further normalized (dim_location → dim_city). Fewer duplicates, more joins. Stars are preferred for BI tools.</p>`,
    realWorld: 'Hospital revenue-cycle warehouses have facts for charges, payments, denials and encounters, sharing conformed dimensions (date, patient, provider, payor, facility). Epic Clarity/Caboodle and most payer analytics platforms are built this way.',
    tips: [
      'Build dim_date for every day in the range (not just days with data) so reports show empty days too.',
      'Use surrogate integer keys in dimensions; source ids can change or collide across systems.',
      'Keep facts additive (amounts, counts); store ratios as numerator and denominator.',
    ],
    deep: `<p>Real warehouses use <b>ROLLUP</b>, <b>CUBE</b> and <b>GROUPING SETS</b> to produce subtotals in one pass (PostgreSQL, SQL Server, Oracle, Snowflake). SQLite lacks them, so you emulate a rollup with <code>UNION ALL</code> of the detail, subtotal and grand-total queries (see the challenge). Semi-additive measures (a balance) can be summed across payors but not across dates; you take the last value per period instead. Dimension history (a payor's contract rate changing) is handled with Slowly Changing Dimensions, the next lesson.</p>`,
    tryIt: {
      prompt: 'Build a smaller star with CTEs instead of tables, and roll up billed amount from month to quarter by practitioner specialty. Change GROUP BY to d.month to drill down.',
      starter: `WITH dim_date AS (
  SELECT DISTINCT service_date AS date_key,
         strftime('%Y', service_date) || '-Q' || ((CAST(strftime('%m', service_date) AS INTEGER) + 2) / 3) AS quarter,
         strftime('%Y-%m', service_date) AS month
  FROM charges
),
dim_practitioner AS (
  SELECT practitioner_id AS practitioner_key, specialty FROM practitioners
),
fact_charges AS (
  SELECT service_date AS date_key, practitioner_id AS practitioner_key, amount FROM charges
)
SELECT d.quarter, pr.specialty, SUM(f.amount) AS billed
FROM fact_charges f
JOIN dim_date d          ON d.date_key = f.date_key
JOIN dim_practitioner pr ON pr.practitioner_key = f.practitioner_key
GROUP BY d.quarter, pr.specialty
ORDER BY d.quarter, billed DESC;`,
    },
    challenge: {
      level: 4,
      prompt: "Emulate ROLLUP on a star built with CTEs. Fact = one row per charge (amount) with its invoice's payor_type (use 'Unknown' when the invoice has no payor) and location_type. Return payor_type, location_type and billed for: every (payor_type, location_type) pair, a subtotal per payor_type with location_type = 'ALL', and a grand total with both = 'ALL'. Order by payor_type (with 'ALL' last), then location_type (with 'ALL' last).",
      solution: `WITH fact AS (
  SELECT COALESCE(p.payor_type, 'Unknown') AS payor_type,
         l.location_type,
         c.amount
  FROM charges c
  JOIN invoices i            ON i.invoice_id = c.invoice_id
  LEFT JOIN payors p         ON p.payor_id = i.payor_id
  JOIN treatment_locations l ON l.location_id = i.location_id
),
rolled AS (
  SELECT payor_type, location_type, SUM(amount) AS billed FROM fact GROUP BY payor_type, location_type
  UNION ALL
  SELECT payor_type, 'ALL', SUM(amount) FROM fact GROUP BY payor_type
  UNION ALL
  SELECT 'ALL', 'ALL', SUM(amount) FROM fact
)
SELECT payor_type, location_type, billed
FROM rolled
ORDER BY payor_type = 'ALL', payor_type, location_type = 'ALL', location_type;`,
      hints: [
        "Start with a fact CTE: charges JOIN invoices, LEFT JOIN payors (COALESCE the type to 'Unknown'), JOIN treatment_locations.",
        'A rollup is three GROUP BY levels stacked with UNION ALL: (payor_type, location_type), (payor_type), ().',
        "Fill the rolled-up columns with the literal 'ALL' so all three branches have the same columns.",
        "ORDER BY payor_type = 'ALL', payor_type, location_type = 'ALL', location_type puts subtotals after details (a false comparison is 0, true is 1).",
      ],
      ordered: true,
    },
    quiz: [
      { q: 'What does the fact table in a star schema contain?', options: ['Descriptive attributes like names and cities', 'Foreign keys to dimensions plus numeric measures at a declared grain', 'Only aggregated totals', 'User accounts'], answer: 1, why: 'Facts are events at a grain: keys + measures.' },
      { q: 'Which workload is OLAP?', options: ['Posting a payment to invoice 12', 'Updating a patient address', 'Billed amount by payor type per quarter for two years', 'Looking up one patient by id'], answer: 2, why: 'Large scans and aggregations across history are analytical.' },
      { q: 'Why add an "unknown" row (key -1) to dim_payor?', options: ['To save space', 'So facts with a missing payor still join and are not lost from totals', 'Because SQLite requires it', 'To speed up UNION'], answer: 1, why: 'NULL keys fall out of inner joins; the unknown member keeps totals complete.' },
    ],
  },

  // ---------------------------------------------------------------- 28
  {
    id: 'advanced-28',
    goals: [
      'What a Slowly Changing Dimension (SCD) is and why history matters',
      'SCD Type 1 (overwrite), Type 2 (new row with valid_from/valid_to/is_current) and Type 3 (previous-value column)',
      'Apply a Type 2 change to a payor contract_rate: close the old row, insert the new one',
      'Join facts to the version that was valid on the event date (point-in-time join)',
    ],
    concept: `<p>Dimension attributes change slowly: a payor renegotiates its <code>contract_rate</code>, a practitioner moves to another location. The question is: <b>what should old facts see?</b></p>
<ul>
<li><b>Type 1, overwrite</b>: <code>UPDATE ... SET contract_rate = 0.72</code>. Simple, no history. Old invoices now look as if they were billed at 0.72.</li>
<li><b>Type 2, add a row</b>: close the current row (<code>valid_to</code> = change date, <code>is_current</code> = 0) and insert a new row with the new value (<code>valid_from</code> = change date, <code>valid_to</code> = '9999-12-31', <code>is_current</code> = 1). Full history; each version gets its own surrogate key.</li>
<li><b>Type 3, add a column</b>: keep <code>current_rate</code> and <code>previous_rate</code> side by side. Only one step of history.</li>
</ul>
<p>With Type 2, facts join on the business key <b>and</b> the date: <code>invoice_date &gt;= valid_from AND invoice_date &lt; valid_to</code>. Each invoice sees the rate that was in effect when it was billed.</p>`,
    why: 'Expected reimbursement, contract audits and denial analysis must use the contract that applied on the date of service. Overwriting the rate rewrites history and makes last year\'s variance reports wrong.',
    when: 'Use Type 2 whenever reports must reflect "as it was then": contract rates, practitioner location or specialty, patient plan membership. Use Type 1 for corrections (a typo in a name). Use Type 3 for a single "before vs after" comparison.',
    analogy: 'A payor contract binder: when a new contract is signed, the old one is not shredded. It is stamped "valid until June 30" and filed behind the new one stamped "valid from July 1". To check an old claim, you pull the contract whose stamp covers the claim date.',
    exampleSql: `SELECT payor_id, payor_name, payor_type, contract_rate, is_active FROM payors ORDER BY payor_id`,
    syntax: `-- Type 2 change, effective :d
UPDATE dim SET valid_to = :d, is_current = 0
WHERE business_key = :k AND is_current = 1;
INSERT INTO dim (business_key, attr, valid_from, valid_to, is_current)
VALUES (:k, :new_value, :d, '9999-12-31', 1);

-- Point-in-time join
JOIN dim d ON d.business_key = f.key
          AND f.event_date >= d.valid_from AND f.event_date < d.valid_to`,
    sql: `CREATE TABLE dim_payor_scd (
  payor_sk      INTEGER PRIMARY KEY,           -- surrogate key: one per version
  payor_id      INTEGER NOT NULL,              -- business key
  payor_name    TEXT,
  contract_rate REAL,
  valid_from    TEXT NOT NULL,
  valid_to      TEXT NOT NULL,                 -- exclusive end
  is_current    INTEGER NOT NULL
);

-- Initial load: every payor valid from the start of the data
INSERT INTO dim_payor_scd (payor_id, payor_name, contract_rate, valid_from, valid_to, is_current)
SELECT payor_id, payor_name, contract_rate, '2025-01-01', '9999-12-31', 1 FROM payors;

-- Type 2 change: Aetna Care (payor 2) drops from 0.75 to 0.72 on 2026-07-01
UPDATE dim_payor_scd
SET valid_to = '2026-07-01', is_current = 0
WHERE payor_id = 2 AND is_current = 1;

INSERT INTO dim_payor_scd (payor_id, payor_name, contract_rate, valid_from, valid_to, is_current)
VALUES (2, 'Aetna Care', 0.72, '2026-07-01', '9999-12-31', 1);

-- Point-in-time join: each Aetna invoice uses the rate valid on its invoice_date
SELECT i.invoice_id, i.invoice_date, i.total_amount,
       d.payor_sk, d.contract_rate,
       ROUND(i.total_amount * d.contract_rate, 2) AS expected_payment
FROM invoices i
JOIN dim_payor_scd d
  ON d.payor_id = i.payor_id
 AND i.invoice_date >= d.valid_from
 AND i.invoice_date <  d.valid_to
WHERE i.payor_id = 2 AND i.invoice_date >= '2026-06-01'
ORDER BY i.invoice_date, i.invoice_id;`,
    breakdown: [
      ['payor_sk INTEGER PRIMARY KEY', 'Surrogate key: each version of a payor gets its own id; facts can point at the exact version.'],
      ['valid_from / valid_to / is_current', 'The version window (half-open: from inclusive, to exclusive) and a flag for the latest version.'],
      ["'9999-12-31'", "An open end date for the current version, so range checks never need NULL handling."],
      ['UPDATE ... SET valid_to = \'2026-07-01\', is_current = 0', 'Step 1 of a Type 2 change: close the current row.'],
      ['INSERT ... VALUES (2, \'Aetna Care\', 0.72, \'2026-07-01\', ...)', 'Step 2: open a new current row with the new rate.'],
      ['i.invoice_date >= d.valid_from AND i.invoice_date < d.valid_to', 'Point-in-time join: exactly one version matches each invoice. June invoices get 0.75, July/August get 0.72.'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 640 190" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">
<text x="10" y="20" fill="var(--text)" font-weight="bold">dim_payor_scd, payor 2 (Aetna Care): Type 2 history</text>
<line x1="40" y1="120" x2="610" y2="120" stroke="var(--muted)"/>
<rect x="40" y="45" width="340" height="34" rx="6" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="50" y="66" fill="var(--text)">sk 2 | rate 0.75 | 2025-01-01 → 2026-07-01 | is_current 0</text>
<rect x="380" y="85" width="230" height="30" rx="6" fill="var(--panel2)" stroke="var(--green)" stroke-width="2"/>
<text x="390" y="104" fill="var(--text)">sk 8 | rate 0.72 | → 9999-12-31 | 1</text>
<line x1="380" y1="35" x2="380" y2="130" stroke="var(--red)" stroke-dasharray="4 3"/>
<text x="330" y="145" fill="var(--red)">change 2026-07-01</text>
<circle cx="340" cy="120" r="5" fill="var(--accent)"/><text x="270" y="170" fill="var(--text)">inv 3 (Jun 10) → 0.75</text>
<circle cx="450" cy="120" r="5" fill="var(--accent)"/><text x="430" y="170" fill="var(--text)">inv 31 (Jul 20) → 0.72</text>
</svg>` },
    dialectSql: {
      sqlite: `-- Two statements in a transaction
BEGIN;
UPDATE dim_payor_scd SET valid_to = '2026-07-01', is_current = 0 WHERE payor_id = 2 AND is_current = 1;
INSERT INTO dim_payor_scd (payor_id, payor_name, contract_rate, valid_from, valid_to, is_current)
VALUES (2, 'Aetna Care', 0.72, '2026-07-01', '9999-12-31', 1);
COMMIT;`,
      postgres: `-- Close changed rows, then insert new versions from a staging table
UPDATE dim_payor_scd d SET valid_to = CURRENT_DATE, is_current = false
FROM stg_payors s
WHERE d.payor_id = s.payor_id AND d.is_current AND d.contract_rate IS DISTINCT FROM s.contract_rate;
INSERT INTO dim_payor_scd (payor_id, payor_name, contract_rate, valid_from, valid_to, is_current)
SELECT s.payor_id, s.payor_name, s.contract_rate, CURRENT_DATE, '9999-12-31', true
FROM stg_payors s
LEFT JOIN dim_payor_scd d ON d.payor_id = s.payor_id AND d.is_current
WHERE d.payor_id IS NULL;`,
      sqlserver: `-- Temporal tables do Type 2 automatically
CREATE TABLE payors (... ,
  valid_from datetime2 GENERATED ALWAYS AS ROW START,
  valid_to   datetime2 GENERATED ALWAYS AS ROW END,
  PERIOD FOR SYSTEM_TIME (valid_from, valid_to))
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.payors_history));
SELECT * FROM payors FOR SYSTEM_TIME AS OF '2026-06-15';`,
    },
    internals: `<p>A Type 2 dimension grows by one row per change, so it stays small compared with facts. Two common designs: (1) the fact stores the <b>surrogate key</b> (payor_sk) looked up at load time, so reports use a plain equi-join; or (2) the fact stores the business key and the event date, and reports use a <b>range join</b> on valid_from/valid_to. Design (1) is faster to query; design (2) is easier to reload. An index on <code>(payor_id, valid_from)</code> makes the range lookup a quick seek. Half-open windows (<code>&gt;= from AND &lt; to</code>) guarantee that consecutive versions never overlap or leave gaps.</p>`,
    mistakes: [
      { wrong: `SELECT i.invoice_id, i.invoice_date, ROUND(i.total_amount * p.contract_rate, 2) AS expected
FROM invoices i JOIN payors p ON p.payor_id = i.payor_id
WHERE i.payor_id = 2;  -- after a Type 1 UPDATE of the rate`, why: 'With Type 1 (overwrite) the rate table only knows today\'s rate, so old invoices are re-priced with a contract that did not exist then.', fix: `WITH rates(payor_id, contract_rate, valid_from, valid_to) AS (
  VALUES (2, 0.75, '2025-01-01', '2026-07-01'), (2, 0.72, '2026-07-01', '9999-12-31'))
SELECT i.invoice_id, i.invoice_date, ROUND(i.total_amount * r.contract_rate, 2) AS expected
FROM invoices i JOIN rates r ON r.payor_id = i.payor_id
 AND i.invoice_date >= r.valid_from AND i.invoice_date < r.valid_to
WHERE i.payor_id = 2;` },
      { wrong: `WITH rates(payor_id, contract_rate, valid_from, valid_to) AS (
  VALUES (2, 0.75, '2025-01-01', '2026-07-01'), (2, 0.72, '2026-07-01', '9999-12-31'))
SELECT i.invoice_id, r.contract_rate FROM invoices i JOIN rates r ON r.payor_id = i.payor_id
 AND i.invoice_date BETWEEN r.valid_from AND r.valid_to
WHERE i.payor_id = 2;`, why: 'BETWEEN is inclusive on both ends. An invoice dated exactly 2026-07-01 matches BOTH versions and is counted twice. With valid_to as the start of the next version, use >= and <.', fix: `WITH rates(payor_id, contract_rate, valid_from, valid_to) AS (
  VALUES (2, 0.75, '2025-01-01', '2026-07-01'), (2, 0.72, '2026-07-01', '9999-12-31'))
SELECT i.invoice_id, r.contract_rate FROM invoices i JOIN rates r ON r.payor_id = i.payor_id
 AND i.invoice_date >= r.valid_from AND i.invoice_date < r.valid_to
WHERE i.payor_id = 2;` },
    ],
    rules: [
      'Type 1 overwrites, Type 2 adds a row, Type 3 adds a column.',
      'Type 2 change = close the current row + insert the new one, in one transaction.',
      'Use half-open windows (>= valid_from AND < valid_to) so versions never overlap.',
      'Join facts on business key AND date to get the version in effect.',
      'is_current = 1 is for "today" views only, never for historical facts.',
    ],
    compare: `<table><tr><th>Type</th><th>How</th><th>History</th><th>Use for</th></tr>
<tr><td>0</td><td>Never change</td><td>Original only</td><td>date_of_birth, original enrollment date</td></tr>
<tr><td>1</td><td>UPDATE in place</td><td>None</td><td>Corrections, typos</td></tr>
<tr><td>2</td><td>New row + validity window</td><td>Full</td><td>Contract rates, locations, plan membership</td></tr>
<tr><td>3</td><td>current + previous columns</td><td>One step</td><td>"Before vs after the merger" reports</td></tr>
<tr><td>6</td><td>1 + 2 + 3 combined</td><td>Full + current value on every row</td><td>Reports that need both "then" and "now"</td></tr></table>`,
    realWorld: 'Payer contract management systems keep every fee schedule and rate version with effective dates; expected-reimbursement and underpayment detection join each claim to the contract version valid on the date of service. Warehouse tools (dbt snapshots, Informatica, SSIS SCD component) generate Type 2 logic automatically.',
    tips: [
      "Use '9999-12-31' as the open end instead of NULL to keep range predicates simple.",
      'Add a unique index on (payor_id) WHERE is_current = 1 to guarantee one current version.',
      'Load dimension changes before the facts of the same day, so new facts find the new version.',
    ],
    deep: `<p>Type 2 tracks <b>valid time</b> (when the rate applied in the real world). Some systems also need <b>transaction time</b> (when the database learned about it), for example a retroactive contract signed in August but effective July 1. Keeping both is a <b>bitemporal</b> model: you can answer "what rate did we believe applied to July invoices, as of July 15?". SQL:2011 standardizes application-time and system-time periods; SQL Server, MariaDB and Db2 implement system-versioned temporal tables, and PostgreSQL uses range types with exclusion constraints (<code>EXCLUDE USING gist (payor_id WITH =, validity WITH &amp;&amp;)</code>) to forbid overlapping versions.</p>`,
    tryIt: {
      prompt: 'Apply a second Type 2 change: Medicare Part B (payor 3) goes from 0.65 to 0.68 on 2026-06-15. Then list all versions of payors 2 and 3, and check that exactly one row per payor has is_current = 1.',
      starter: `CREATE TABLE dim_payor_scd (payor_sk INTEGER PRIMARY KEY, payor_id INTEGER, payor_name TEXT,
  contract_rate REAL, valid_from TEXT, valid_to TEXT, is_current INTEGER);
INSERT INTO dim_payor_scd (payor_id, payor_name, contract_rate, valid_from, valid_to, is_current)
SELECT payor_id, payor_name, contract_rate, '2025-01-01', '9999-12-31', 1 FROM payors;

UPDATE dim_payor_scd SET valid_to = '2026-06-15', is_current = 0 WHERE payor_id = 3 AND is_current = 1;
INSERT INTO dim_payor_scd (payor_id, payor_name, contract_rate, valid_from, valid_to, is_current)
VALUES (3, 'Medicare Part B', 0.68, '2026-06-15', '9999-12-31', 1);

SELECT * FROM dim_payor_scd WHERE payor_id IN (2, 3) ORDER BY payor_id, valid_from;`,
    },
    challenge: {
      level: 3,
      buggy: `WITH payor_history(payor_sk, payor_id, contract_rate, valid_from, valid_to, is_current) AS (
  VALUES (1, 1, 0.78, '2025-01-01', '2026-01-01', 0),
         (2, 1, 0.80, '2026-01-01', '9999-12-31', 1),
         (3, 2, 0.75, '2025-01-01', '2026-07-01', 0),
         (4, 2, 0.72, '2026-07-01', '9999-12-31', 1),
         (5, 3, 0.62, '2025-01-01', '2025-10-01', 0),
         (6, 3, 0.65, '2025-10-01', '9999-12-31', 1)
)
SELECT i.invoice_id, i.invoice_date, h.contract_rate,
       ROUND(i.total_amount * h.contract_rate, 2) AS expected_payment
FROM invoices i
JOIN payor_history h ON h.payor_id = i.payor_id AND h.is_current = 1
WHERE i.payor_id IN (1, 2, 3) AND i.status <> 'Void'
ORDER BY i.invoice_id;`,
      prompt: 'This expected-payment report uses a Type 2 payor history, but every invoice is priced with TODAY\'s contract rate. Fix it so each invoice uses the version valid on its invoice_date (valid_from inclusive, valid_to exclusive). Keep the same columns and order.',
      solution: `WITH payor_history(payor_sk, payor_id, contract_rate, valid_from, valid_to, is_current) AS (
  VALUES (1, 1, 0.78, '2025-01-01', '2026-01-01', 0),
         (2, 1, 0.80, '2026-01-01', '9999-12-31', 1),
         (3, 2, 0.75, '2025-01-01', '2026-07-01', 0),
         (4, 2, 0.72, '2026-07-01', '9999-12-31', 1),
         (5, 3, 0.62, '2025-01-01', '2025-10-01', 0),
         (6, 3, 0.65, '2025-10-01', '9999-12-31', 1)
)
SELECT i.invoice_id, i.invoice_date, h.contract_rate,
       ROUND(i.total_amount * h.contract_rate, 2) AS expected_payment
FROM invoices i
JOIN payor_history h
  ON h.payor_id = i.payor_id
 AND i.invoice_date >= h.valid_from
 AND i.invoice_date <  h.valid_to
WHERE i.payor_id IN (1, 2, 3) AND i.status <> 'Void'
ORDER BY i.invoice_id;`,
      hints: [
        'is_current = 1 always picks the latest version, whatever the invoice date.',
        'The join must match the business key AND the date window.',
        'Replace h.is_current = 1 with a range condition on i.invoice_date.',
        'ON h.payor_id = i.payor_id AND i.invoice_date >= h.valid_from AND i.invoice_date < h.valid_to',
      ],
      ordered: true,
    },
    quiz: [
      { q: 'A payor changes its contract rate and old invoices must keep the old rate in reports. Which SCD type?', options: ['Type 0', 'Type 1', 'Type 2', 'No dimension needed'], answer: 2, why: 'Type 2 keeps every version with its validity window.' },
      { q: 'What are the two steps of a Type 2 change?', options: ['DELETE old row, INSERT new row', 'Close the current row (valid_to, is_current = 0), insert a new current row', 'UPDATE the value in place', 'Add a previous_value column'], answer: 1, why: 'The old version stays for history, just closed.' },
      { q: 'Why use >= valid_from AND < valid_to instead of BETWEEN?', options: ['BETWEEN is slower', 'Half-open windows never overlap, so a change-date invoice matches exactly one version', 'SQLite has no BETWEEN', 'To include NULLs'], answer: 1, why: 'BETWEEN is inclusive on both ends and double-matches the boundary date.' },
    ],
  },
]);
