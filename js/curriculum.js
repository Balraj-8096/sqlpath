// Course structure. Lesson ids are `${section.key}-NN` (01-based) and are generated below.
(function () {
  const S = [
    { key: 'foundations', num: '01', title: 'Foundational Concepts', short: 'Foundations', icon: '🧱', level: 'Beginner', prereq: [],
      lessons: ['What is a Database?', 'What is a Relational Database?', 'Tables, Rows and Columns', 'Primary Keys', 'Foreign Keys', 'Candidate Keys', 'Composite Keys', 'Unique Keys', 'Data Types', 'Constraints', 'Understanding NULL Values', 'Schema Design', 'Table Relationships', 'One-to-One Relationships', 'One-to-Many Relationships', 'Many-to-Many Relationships', 'Normalization', 'Database Engines', 'ACID Properties', 'Transactions', 'ANSI SQL Standards', 'SQL Dialects and Database Differences', 'SQL vs NoSQL'] },
    { key: 'fundamentals', num: '02', title: 'SQL Fundamentals', short: 'Fundamentals', icon: '🔤', level: 'Beginner', prereq: ['foundations'],
      lessons: ['SELECT & Data Retrieval', 'FROM Clause', 'WHERE Clause', 'Comparison Operators', 'Logical Operators', 'Column Aliasing', 'Expressions', 'DISTINCT', 'Data Type Conversion', 'CASE Statements', 'INSERT', 'UPDATE', 'DELETE', 'Arithmetic Functions', 'String Functions', 'Date & Time Functions', 'ORDER BY', 'LIMIT & OFFSET', 'NULL Handling', 'Basic Transactions', 'Writing Readable SQL', 'NULL Ordering & Random Sampling'] },
    { key: 'filtering', num: '03', title: 'Advanced Filtering', short: 'Filtering', icon: '🔍', level: 'Beginner', prereq: ['fundamentals'],
      lessons: ['LIKE', 'REGEX / Pattern Matching', 'IN', 'BETWEEN', 'EXISTS', 'NOT EXISTS', 'Complex Boolean Conditions', 'Operator Precedence', 'NULL-Safe Filtering', 'Range Filtering', 'Filtering with Subqueries', 'Filtering with CTEs', 'Advanced NOT Logic'] },
    { key: 'aggregates', num: '04', title: 'Aggregate Functions & Grouping', short: 'Aggregations', icon: '📊', level: 'Intermediate', prereq: ['filtering'],
      lessons: ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'NULL Handling in Aggregates', 'GROUP BY', 'HAVING', 'Multiple Aggregates', 'Conditional Aggregation', 'CASE + Aggregates', 'FILTER', 'String Aggregation', 'Statistical Functions', 'DISTINCT vs ALL', 'ROLLUP', 'CUBE', 'GROUPING SETS', 'Aggregate Functions vs Window Functions'] },
    { key: 'joins', num: '05', title: 'Joins & Relationships', short: 'Joins', icon: '🔗', level: 'Intermediate', prereq: ['aggregates'],
      lessons: ['Why Do We Need JOINs?', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN', 'CROSS JOIN', 'SELF JOIN', 'Multiple Table JOINs', 'Many-to-Many JOINs', 'JOIN Conditions', 'JOIN + GROUP BY', 'JOIN + Aggregation', 'Anti-JOINs', 'Semi-JOINs', 'EXISTS Patterns', 'JOIN Order', 'JOIN Performance', 'LATERAL JOINs', 'JOIN vs Subquery', 'JOIN vs EXISTS', 'Range (Non-Equi) JOINs'] },
    { key: 'subqueries', num: '06', title: 'Subqueries & CTEs', short: 'Subqueries', icon: '🪆', level: 'Intermediate', prereq: ['joins'],
      lessons: ['What is a Subquery?', 'Types of Subqueries', 'Scalar Subqueries', 'Subqueries in SELECT', 'Subqueries in WHERE', 'Subqueries in FROM', 'Derived Tables', 'Correlated Subqueries', 'Correlated Subquery Execution', 'Common Table Expressions', 'Multiple CTEs', 'Recursive CTEs', 'Hierarchical Data', 'CTE vs Subquery', 'CTE vs JOIN', 'CTE Performance', 'Materialized CTE Concepts'] },
    { key: 'windows', num: '07', title: 'Window Functions', short: 'Window Functions', icon: '🪟', level: 'Advanced', prereq: ['subqueries'],
      lessons: ['What Are Window Functions?', 'Why GROUP BY Is Not Enough', 'OVER()', 'PARTITION BY', 'ORDER BY Inside OVER()', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE', 'Aggregate Window Functions', 'Running Totals', 'Moving Averages', 'Ranking Within Groups', 'PARTITION BY vs GROUP BY', 'Window Frames', 'ROWS vs RANGE', 'Advanced Analytics', 'Real-World Window Patterns', 'Window Function Optimization'] },
    { key: 'setops', num: '08', title: 'Set Operations', short: 'Set Operations', icon: '⚪', level: 'Intermediate', prereq: ['joins'],
      lessons: ['UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT / MINUS', 'Column Compatibility', 'Duplicate Handling', 'ORDER BY with Set Operations', 'UNION vs JOIN', 'UNION vs OR', 'Real-World Set Operation Problems'] },
    { key: 'execution', num: '09', title: 'Query Execution & SQL Mental Model', short: 'Query Execution', icon: '⚙️', level: 'Intermediate', prereq: ['aggregates'],
      lessons: ['Logical vs Physical Query Processing', 'FROM & JOIN Come First', 'WHERE Filters Before Grouping', 'GROUP BY & HAVING Stage', 'SELECT Happens Late', 'DISTINCT, ORDER BY & LIMIT', 'Tracing a Full Query', 'Execution-Order Mistakes', 'Debugging a Query Step by Step', 'Testing & Validating SQL'] },
    { key: 'optimization', num: '10', title: 'Query Optimization & Performance', short: 'Optimization', icon: '🚀', level: 'Advanced', prereq: ['execution'],
      lessons: ['What is Query Performance?', 'Query Execution', 'EXPLAIN', 'EXPLAIN ANALYZE', 'Execution Plans', 'Table Scans', 'Index Scans', 'Index Types', 'Composite Indexes', 'Covering Indexes', 'Index Selectivity', 'Cardinality', 'Statistics', 'Join Optimization', 'Subquery Optimization', 'Aggregate Optimization', 'Query Rewriting', 'Avoiding N+1 Queries', 'Partitioning', 'Caching', 'Memory Management', 'Real-World Performance Cases'] },
    { key: 'dialects', num: '11', title: 'Database-Specific SQL', short: 'Dialects', icon: '🗂️', level: 'Advanced', prereq: ['fundamentals'],
      lessons: [
        ['MySQL', 'MySQL Architecture'], ['MySQL', 'MySQL JSON Functions'], ['MySQL', 'MySQL String Functions'], ['MySQL', 'MySQL Math Functions'], ['MySQL', 'MySQL Date Functions'], ['MySQL', 'MySQL Full-Text Search'], ['MySQL', 'MySQL-Specific Syntax'],
        ['PostgreSQL', 'PostgreSQL Architecture'], ['PostgreSQL', 'PostgreSQL Arrays'], ['PostgreSQL', 'JSON / JSONB'], ['PostgreSQL', 'Advanced Data Types'], ['PostgreSQL', 'PostgreSQL Full-Text Search'], ['PostgreSQL', 'PostgreSQL-Specific Functions'],
        ['SQL Server', 'T-SQL Basics'], ['SQL Server', 'TOP'], ['SQL Server', 'CROSS APPLY & OUTER APPLY'], ['SQL Server', 'Windowing in SQL Server'], ['SQL Server', 'Pagination with OFFSET FETCH'], ['SQL Server', 'Stored Procedures in T-SQL'],
        ['Oracle', 'Oracle SQL'], ['Oracle', 'PL/SQL Basics'], ['Oracle', 'Advanced PL/SQL'], ['Oracle', 'Packages'], ['Oracle', 'Procedures'], ['Oracle', 'Functions'],
        ['SQLite', 'Embedded Databases'], ['SQLite', 'SQLite Limitations'], ['SQLite', 'SQLite-Specific Features'],
        ['Cross-Database', 'Same Query, Five Databases'], ['Cross-Database', 'Pagination Across Dialects'], ['Cross-Database', 'Date & String Differences'],
      ] },
    { key: 'dml', num: '12', title: 'Data Modification & Transactions', short: 'Modification & Txns', icon: '✏️', level: 'Intermediate', prereq: ['fundamentals'],
      lessons: ['INSERT', 'INSERT Multiple Rows', 'INSERT SELECT', 'UPDATE', 'UPDATE with JOIN', 'DELETE', 'DELETE with JOIN', 'TRUNCATE', 'MERGE', 'UPSERT', 'Transactions', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'ACID', 'Isolation Levels', 'Dirty Reads', 'Non-Repeatable Reads', 'Phantom Reads', 'Deadlocks', 'Optimistic Locking', 'SELECT FOR UPDATE & Pessimistic Locking', 'MVCC', 'Error Handling in SQL'] },
    { key: 'ddl', num: '13', title: 'Schema Design & Advanced DDL', short: 'Schema Design', icon: '📐', level: 'Advanced', prereq: ['foundations', 'dml'],
      lessons: ['CREATE DATABASE', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'Constraints', 'Primary Keys', 'Foreign Keys', 'CHECK Constraints', 'UNIQUE Constraints', 'Normalization', '1NF', '2NF', '3NF', 'BCNF', 'Denormalization', 'Views', 'Materialized Views', 'Triggers', 'Stored Procedures', 'Partitioning', 'Sharding', 'Auto-Increment, Sequences & UUIDs', 'Generated Columns', 'Views WITH CHECK OPTION', 'Index Creation & Maintenance', 'Temporal & Audit Tables', 'Case Study: Sites, Locations & Roll-ups'] },
    { key: 'advanced', num: '14', title: 'Advanced SQL', short: 'Advanced SQL', icon: '🧠', level: 'Expert', prereq: ['windows', 'subqueries'],
      lessons: ['Recursive Queries', 'Hierarchical Data', 'Graph-like Relationships', 'JSON Querying', 'Arrays', 'Full-Text Search', 'Pivoting', 'Unpivoting', 'Dynamic SQL', 'Temporary Tables', 'Table Variables', 'MERGE Patterns', 'Advanced CASE Expressions', 'Advanced Date Manipulation', 'Cohort Analysis', 'Time-Series Analysis', 'Gap-and-Island Problems', 'Top-N Problems', 'Deduplication', 'Sessionization', 'Consecutive Records', 'Running Balances', 'Retention Analysis', 'Funnel Analysis', 'Time Zones & Timestamps', 'Data Cleaning', 'Star Schema & OLAP', 'Slowly Changing Dimensions'] },
    { key: 'projects', num: '15', title: 'Real-World SQL Projects', short: 'Projects', icon: '🏥', level: 'Expert', prereq: ['joins', 'windows'],
      lessons: ['Revenue Dashboard', 'Accounts Receivable Aging', 'Payor Mix Analysis', 'Practitioner Productivity', 'Treatment Location Performance', 'Patient Balance Statements', 'Ledger Reconciliation', 'Collections & Payment Velocity', 'Duplicate & Anomaly Detection', 'Revenue Cycle KPI Report'] },
    { key: 'security', num: '16', title: 'Security, Administration & Applications', short: 'Security & Admin', icon: '🛡️', level: 'Advanced', prereq: ['ddl', 'dml'],
      lessons: ['Users & Roles', 'GRANT & REVOKE', 'Principle of Least Privilege', 'Views as a Security Layer', 'Row-Level Security', 'SQL Injection', 'Parameterized Queries', 'Encryption & Data Masking (PHI)', 'Backup & Restore', 'Import & Export (CSV, Bulk Load)', 'Monitoring & Access Auditing', 'SQL from Application Code (Drivers, ORMs, Pools)'] },
  ];

  const lessons = [];
  S.forEach((sec, si) => {
    sec.index = si;
    sec.ids = [];
    sec.lessons.forEach((l, i) => {
      const [group, title] = Array.isArray(l) ? l : [null, l];
      const id = `${sec.key}-${String(i + 1).padStart(2, '0')}`;
      const lesson = { id, title, group, section: sec.key, n: i + 1, order: lessons.length };
      lessons.push(lesson);
      sec.ids.push(id);
    });
  });
  const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));
  const sectionByKey = Object.fromEntries(S.map((s) => [s.key, s]));

  // The recommended learning path (roadmap view).
  const PATH = ['foundations', 'fundamentals', 'filtering', 'aggregates', 'joins', 'subqueries', 'windows', 'setops', 'execution', 'optimization', 'ddl', 'security', 'advanced', 'projects'];

  window.Curriculum = { sections: S, lessons, byId, sectionByKey, PATH, MIN_PER_LESSON: 12 };
})();
