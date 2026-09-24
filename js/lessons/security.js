// Section 16: Security, Administration & Applications (security-01 .. security-12)
// SQLite has no users, GRANT or row-level security, so those lessons show PostgreSQL (dialect: 'postgres')
// and give runnable SQLite emulations in tryIt / challenge: permission tables, views, a "current user" CTE,
// masking with substr/||, snapshot tables and audit triggers.
// State-mode checks that read an object the learner must create start with CREATE ... IF NOT EXISTS <empty
// placeholder>, so the check also runs on an untouched database (and returns no rows there).
Lessons.add([
  // ---------------------------------------------------------------- 01
  {
    id: 'security-01',
    goals: ['What a database user (login) and a role are', 'Why you grant privileges to roles, not to people', 'Group roles vs login roles and role membership', 'How users and roles work in PostgreSQL, MySQL, SQL Server, Oracle and (not) SQLite'],
    concept: `<p>A server database does not let just anyone in. Every connection <b>logs in</b> as a database <b>user</b> (also called a <i>login</i> or <i>login role</i>). The database then decides what that user may do.</p>
<p>A <b>role</b> is a named bundle of permissions, like a job description: <code>billing_clerk</code>, <code>auditor</code>, <code>practitioner</code>. You give permissions to the role once, then make people <b>members</b> of the role. When Amy joins the billing team, you add her to <code>billing_clerk</code>. When she leaves, you remove her. You never have to touch 40 separate table permissions.</p>
<ul>
<li><b>Login role (user)</b>: can connect, has a password or certificate. One per person or per application service.</li>
<li><b>Group role</b>: cannot log in (<code>NOLOGIN</code>), only holds privileges.</li>
<li><b>Membership</b>: <code>GRANT billing_clerk TO amy</code>. Roles can be nested: <code>senior_clerk</code> can be a member of <code>billing_clerk</code> and add a few extra rights.</li>
</ul>
<p>In PostgreSQL users and groups are both just <i>roles</i>. MySQL, SQL Server and Oracle separate <b>users</b> from <b>roles</b>, but the idea is the same. <b>SQLite has no users at all</b>: whoever can read the <code>.db</code> file can read everything, so the application (and the file system) must enforce access.</p>`,
    why: 'HIPAA requires unique user identification and access based on job function. Roles make that manageable: permissions follow the job, not the person.',
    when: 'Whenever more than one person or program uses the database: staff, reporting tools, ETL jobs, the web application itself.',
    analogy: 'A hospital badge system. The badge (login) proves who you are. The badge profile (role) says which doors open: billing office yes, pharmacy no. When someone changes jobs, security changes their profile, not every door lock.',
    exampleSql: `SELECT posted_by AS login_name, COUNT(*) AS ledger_lines
FROM transactions
GROUP BY posted_by
ORDER BY ledger_lines DESC`,
    syntax: `CREATE ROLE group_role NOLOGIN;\nCREATE ROLE user_name LOGIN PASSWORD '...';\nGRANT group_role TO user_name;       -- membership\nREVOKE group_role FROM user_name;\nDROP ROLE user_name;`,
    dialect: 'postgres',
    sql: `-- Group roles (NOLOGIN): bundles of privileges, one per job function
CREATE ROLE billing_clerk NOLOGIN;
CREATE ROLE auditor       NOLOGIN;
CREATE ROLE practitioner  NOLOGIN;

-- Login roles (users): one per person or service
CREATE ROLE amy       LOGIN PASSWORD 'change-me-1' IN ROLE billing_clerk;
CREATE ROLE raj       LOGIN PASSWORD 'change-me-2';
GRANT billing_clerk TO raj;
CREATE ROLE dr_okafor LOGIN PASSWORD 'change-me-3' IN ROLE practitioner;
CREATE ROLE kim_audit LOGIN PASSWORD 'change-me-4' IN ROLE auditor VALID UNTIL '2026-12-31';
CREATE ROLE etl_svc   LOGIN PASSWORD 'from-the-vault' CONNECTION LIMIT 5;

-- Who is a member of what?
SELECT r.rolname AS member, g.rolname AS member_of
FROM pg_auth_members m
JOIN pg_roles r ON r.oid = m.member
JOIN pg_roles g ON g.oid = m.roleid
ORDER BY member;`,
    breakdown: [
      ['CREATE ROLE billing_clerk NOLOGIN', 'A group role: holds privileges, nobody logs in as it'],
      ['CREATE ROLE amy LOGIN PASSWORD ...', 'A login role (a user) for one real person'],
      ['IN ROLE billing_clerk', 'Makes amy a member of billing_clerk at creation time'],
      ['GRANT billing_clerk TO raj', 'Adds membership later: raj inherits every privilege of billing_clerk'],
      ['VALID UNTIL / CONNECTION LIMIT', 'Temporary access for an external auditor; a cap on connections for a service'],
      ['pg_auth_members + pg_roles', 'Catalog tables that record role membership'],
    ],
    dialectSql: {
      postgres: `CREATE ROLE billing_clerk NOLOGIN;\nCREATE ROLE amy LOGIN PASSWORD 'change-me-1';\nGRANT billing_clerk TO amy;`,
      mysql: `CREATE ROLE 'billing_clerk';\nCREATE USER 'amy'@'%' IDENTIFIED BY 'change-me-1';\nGRANT 'billing_clerk' TO 'amy'@'%';\nSET DEFAULT ROLE 'billing_clerk' TO 'amy'@'%';  -- roles are inactive until set`,
      sqlserver: `CREATE LOGIN amy WITH PASSWORD = 'Change-me-1!';   -- server level\nUSE billing;\nCREATE USER amy FOR LOGIN amy;                    -- database level\nCREATE ROLE billing_clerk;\nALTER ROLE billing_clerk ADD MEMBER amy;`,
      oracle: `CREATE USER amy IDENTIFIED BY "Change-me-1";\nGRANT CREATE SESSION TO amy;   -- permission to log in\nCREATE ROLE billing_clerk;\nGRANT billing_clerk TO amy;`,
      sqlite: `-- SQLite has no users or roles.\n-- Access = operating-system permissions on billing.db.\n-- The application authenticates people and decides what they may run.`,
    },
    visual: { type: 'html', html: `<svg viewBox="0 0 720 300" width="100%" role="img" aria-label="Logins are members of group roles, and group roles hold privileges on tables">
<g font-family="sans-serif" font-size="13">
<text x="70" y="22" fill="var(--muted)" text-anchor="middle">Logins (people / services)</text>
<text x="360" y="22" fill="var(--muted)" text-anchor="middle">Group roles (NOLOGIN)</text>
<text x="630" y="22" fill="var(--muted)" text-anchor="middle">Privileges</text>
<rect x="10" y="40" width="120" height="34" rx="8" fill="var(--panel2)" stroke="var(--blue)"/><text x="70" y="62" fill="var(--text)" text-anchor="middle">amy</text>
<rect x="10" y="90" width="120" height="34" rx="8" fill="var(--panel2)" stroke="var(--blue)"/><text x="70" y="112" fill="var(--text)" text-anchor="middle">raj</text>
<rect x="10" y="140" width="120" height="34" rx="8" fill="var(--panel2)" stroke="var(--blue)"/><text x="70" y="162" fill="var(--text)" text-anchor="middle">dr_okafor</text>
<rect x="10" y="190" width="120" height="34" rx="8" fill="var(--panel2)" stroke="var(--blue)"/><text x="70" y="212" fill="var(--text)" text-anchor="middle">kim_audit</text>
<rect x="10" y="240" width="120" height="34" rx="8" fill="var(--panel2)" stroke="var(--purple)"/><text x="70" y="262" fill="var(--text)" text-anchor="middle">etl_svc</text>
<rect x="290" y="60" width="140" height="40" rx="8" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/><text x="360" y="85" fill="var(--text)" text-anchor="middle">billing_clerk</text>
<rect x="290" y="140" width="140" height="40" rx="8" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/><text x="360" y="165" fill="var(--text)" text-anchor="middle">practitioner</text>
<rect x="290" y="200" width="140" height="40" rx="8" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/><text x="360" y="225" fill="var(--text)" text-anchor="middle">auditor</text>
<rect x="290" y="250" width="140" height="40" rx="8" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/><text x="360" y="275" fill="var(--text)" text-anchor="middle">etl_loader</text>
<g stroke="var(--muted)" stroke-width="1.5" fill="none">
<path d="M130 57 L290 78"/><path d="M130 107 L290 84"/><path d="M130 157 L290 160"/><path d="M130 207 L290 220"/><path d="M130 257 L290 270"/>
<path d="M430 75 L540 55"/><path d="M430 85 L540 95"/><path d="M430 160 L540 150"/><path d="M430 220 L540 205"/><path d="M430 270 L540 260"/>
</g>
<text x="545" y="59" fill="var(--green)">SELECT invoices, payments</text>
<text x="545" y="99" fill="var(--green)">INSERT payments</text>
<text x="545" y="154" fill="var(--green)">SELECT patients, charges</text>
<text x="545" y="209" fill="var(--green)">SELECT all (read-only)</text>
<text x="545" y="264" fill="var(--green)">INSERT via COPY</text>
<text x="210" y="50" fill="var(--muted)" font-size="11" text-anchor="middle">member of</text>
<text x="485" y="40" fill="var(--muted)" font-size="11" text-anchor="middle">granted</text>
</g></svg>` },
    internals: `<p>PostgreSQL stores roles cluster-wide in <code>pg_authid</code> (visible through <code>pg_roles</code>) and memberships in <code>pg_auth_members</code>. When a query runs, the executor checks each table's ACL (access control list, stored in <code>pg_class.relacl</code>) against the current role <b>and every role it inherits from</b>. Passwords are stored as SCRAM-SHA-256 hashes, never as plain text.</p>
<p>Authentication (who are you?) happens at connection time, configured in <code>pg_hba.conf</code> (password, certificate, LDAP, Kerberos). Authorization (what may you do?) happens on every statement.</p>`,
    mistakes: [
      { wrong: `-- Everyone shares one account\nCREATE ROLE billing_team LOGIN PASSWORD 'billing2026';`, why: 'A shared login makes audit logs useless (who changed that invoice?) and violates HIPAA unique user identification. When one person leaves, everyone must learn a new password.', fix: `CREATE ROLE billing_clerk NOLOGIN;\nCREATE ROLE amy LOGIN PASSWORD '...' IN ROLE billing_clerk;\nCREATE ROLE raj LOGIN PASSWORD '...' IN ROLE billing_clerk;` },
      { wrong: `-- The web application connects as the superuser\n-- postgresql://postgres:secret@db/billing`, why: 'If the application is compromised (for example by SQL injection), the attacker gets superuser: drop tables, read every patient, even run OS commands.', fix: `CREATE ROLE billing_app LOGIN PASSWORD '...' IN ROLE billing_clerk;\n-- postgresql://billing_app:...@db/billing` },
      { wrong: `GRANT SELECT ON invoices TO amy;\nGRANT SELECT ON invoices TO raj;\nGRANT SELECT ON invoices TO li;`, why: 'Granting to individuals does not scale and drifts over time: people keep rights from old jobs.', fix: `GRANT SELECT ON invoices TO billing_clerk;\nGRANT billing_clerk TO amy, raj, li;` },
    ],
    rules: ['One login per person or service. Never share accounts.', 'Grant privileges to roles; add people to roles.', 'Applications never connect as a superuser.', 'Remove membership the day someone changes jobs or leaves.'],
    compare: `<table><tr><th></th><th>User / login</th><th>Role</th></tr>
<tr><td>Can connect</td><td>Yes</td><td>No (NOLOGIN)</td></tr>
<tr><td>Represents</td><td>A person or a program</td><td>A job function</td></tr>
<tr><td>Holds privileges</td><td>Possible, but avoid</td><td>Yes, this is its purpose</td></tr>
<tr><td>Changes when</td><td>People join or leave</td><td>The job definition changes</td></tr></table>`,
    realWorld: 'A practice-management system typically has roles like front_desk, billing_clerk, coder, practitioner, auditor, report_reader and one service account per integration (clearinghouse, EHR feed, BI tool). Access reviews every quarter check who is in which role.',
    tips: ['Name login roles after people or services (amy, etl_svc) and group roles after jobs (billing_clerk).', 'Store service passwords in a secrets manager, not in source code.', 'Prefer SSO / LDAP / certificate authentication over database passwords when available.'],
    deep: `<p><b>INHERIT vs SET ROLE.</b> By default PostgreSQL members inherit their groups' privileges automatically. A role created with <code>NOINHERIT</code> must explicitly <code>SET ROLE billing_admin</code> to use the stronger rights, which is a nice pattern for "break-glass" admin access that is logged.</p>
<p><b>Predefined roles</b>: PostgreSQL ships <code>pg_read_all_data</code>, <code>pg_write_all_data</code>, <code>pg_monitor</code>; SQL Server has fixed roles such as <code>db_datareader</code> and <code>db_owner</code>. They are convenient but broad: prefer your own narrow roles for PHI.</p>`,
    tryIt: { prompt: 'SQLite has no roles, so applications often store them in tables. Run this emulation, then add a new login "billing.li" to billing_clerk and run the final query again.', starter: `CREATE TABLE app_roles (role_name TEXT PRIMARY KEY, can_login INTEGER NOT NULL);
CREATE TABLE role_members (
  member    TEXT REFERENCES app_roles(role_name),
  role_name TEXT REFERENCES app_roles(role_name),
  PRIMARY KEY (member, role_name)
);
INSERT INTO app_roles VALUES
  ('billing_clerk', 0), ('auditor', 0), ('practitioner', 0),
  ('billing.amy', 1), ('billing.raj', 1), ('dr_okafor', 1), ('kim_audit', 1);
INSERT INTO role_members VALUES
  ('billing.amy', 'billing_clerk'), ('billing.raj', 'billing_clerk'),
  ('dr_okafor', 'practitioner'), ('kim_audit', 'auditor');

SELECT r.role_name, group_concat(m.member, ', ') AS members
FROM app_roles r
LEFT JOIN role_members m ON m.role_name = r.role_name
WHERE r.can_login = 0
GROUP BY r.role_name
ORDER BY r.role_name;` },
    challenge: {
      level: 2,
      prompt: 'Every ledger line in transactions records the login that posted it (posted_by). Using the role_members list given in the starter, show for each role: role_name, the number of transactions its members posted, and the total amount rounded to 2 decimals. Order by role_name.',
      starter: `WITH role_members(login, role_name) AS (VALUES
  ('billing.amy', 'billing_clerk'),
  ('billing.raj', 'billing_clerk'),
  ('system',      'etl_service')
)
SELECT `,
      solution: `WITH role_members(login, role_name) AS (VALUES
  ('billing.amy', 'billing_clerk'),
  ('billing.raj', 'billing_clerk'),
  ('system',      'etl_service')
)
SELECT m.role_name, COUNT(*) AS lines_posted, ROUND(SUM(t.amount), 2) AS net_amount
FROM transactions t
JOIN role_members m ON m.login = t.posted_by
GROUP BY m.role_name
ORDER BY m.role_name;`,
      hints: ['Join transactions to role_members: which column of transactions holds the login?', 'Join on m.login = t.posted_by.', 'Group by the role, not the login, so amy and raj are combined.', 'SELECT m.role_name, COUNT(*), ROUND(SUM(t.amount), 2) ... GROUP BY m.role_name ORDER BY m.role_name'],
      ordered: true,
    },
    quiz: [
      { q: 'Why grant privileges to a role instead of directly to each user?', options: ['Roles are faster to query', 'Permissions follow the job; people just join or leave the role', 'Users cannot hold privileges', 'It encrypts the data'], answer: 1, why: 'One change to the role affects all members, and membership is easy to review.' },
      { q: 'How does SQLite control which user can read which table?', options: ['GRANT SELECT', 'CREATE ROLE', 'It does not: file access and the application control access', 'PRAGMA users'], answer: 2, why: 'SQLite is an embedded library with no user accounts.' },
      { q: 'What is wrong with the web app connecting as the superuser?', options: ['Nothing if the password is strong', 'Any app bug or injection gets unlimited power over the database', 'Superusers cannot run SELECT', 'It is slower'], answer: 1, why: 'Least privilege: the app account should only have what the app needs.' },
    ],
  },
  // ---------------------------------------------------------------- 02
  {
    id: 'security-02',
    goals: ['Give privileges with GRANT and take them back with REVOKE', 'Object privileges: SELECT, INSERT, UPDATE, DELETE, EXECUTE, USAGE', 'Column-level grants for PHI', 'WITH GRANT OPTION, CASCADE and default privileges', 'Check what a role can actually do'],
    concept: `<p><b>GRANT</b> gives a role permission to do something with an object. <b>REVOKE</b> takes it away. Nothing else changes: the data stays the same, only who may touch it.</p>
<pre>GRANT SELECT, INSERT ON payments TO billing_clerk;
REVOKE INSERT ON payments FROM billing_clerk;</pre>
<p>Common privileges on a table:</p>
<ul>
<li><code>SELECT</code> read rows, <code>INSERT</code> add rows, <code>UPDATE</code> change rows, <code>DELETE</code> remove rows.</li>
<li><code>TRUNCATE</code>, <code>REFERENCES</code> (create a foreign key to it), <code>TRIGGER</code>.</li>
</ul>
<p>You can grant on <b>specific columns</b>: <code>GRANT SELECT (patient_id, first_name, last_name) ON patients TO billing_clerk</code>. The clerk can then read names but gets <i>permission denied</i> for <code>date_of_birth</code> or <code>allergies</code>.</p>
<p>Other objects have their own privileges: <code>EXECUTE</code> on functions and procedures, <code>USAGE</code> on schemas and sequences, <code>CONNECT</code> on a database.</p>
<p><b>By default a new role can do almost nothing</b> with your tables. Access is additive: it only has what was granted to it or to a role it belongs to (and to <code>PUBLIC</code>, which means everyone).</p>`,
    why: 'Privileges are the enforcement point for "who may read or change what". Without them, every login could read every patient record and delete invoices.',
    when: 'When you create a table or view, onboard a new role, change a job definition, or respond to an access review finding.',
    analogy: 'Keys on a hospital key ring. GRANT hands a copy of the key for the records room to the billing team; REVOKE takes that key back. A key "with grant option" means they may cut copies for others, which you rarely want.',
    syntax: `GRANT privilege [, ...] ON object TO role [WITH GRANT OPTION];\nGRANT SELECT (col1, col2) ON table TO role;\nREVOKE privilege ON object FROM role [CASCADE];`,
    dialect: 'postgres',
    sql: `-- Billing clerks: read billing data, post payments, never delete
GRANT SELECT ON invoices, charges, payments, transactions, payors TO billing_clerk;
GRANT INSERT ON payments, transactions TO billing_clerk;
GRANT UPDATE (status) ON invoices TO billing_clerk;               -- only the status column
GRANT SELECT (patient_id, first_name, last_name, primary_payor_id)
  ON patients TO billing_clerk;                                   -- no DOB, email, allergies
GRANT USAGE ON SEQUENCE payments_payment_id_seq TO billing_clerk;

-- Auditors: read everything, change nothing
GRANT SELECT ON ALL TABLES IN SCHEMA public TO auditor;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO auditor;

-- Ledger lines should only come from the posting procedure: take the right back
REVOKE INSERT ON transactions FROM billing_clerk;

-- What can billing_clerk do now?
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'billing_clerk'
ORDER BY table_name, privilege_type;`,
    breakdown: [
      ['GRANT SELECT ON invoices, charges, ... TO billing_clerk', 'Read access to several tables in one statement'],
      ['GRANT UPDATE (status) ON invoices', 'Column-level: the clerk can change status but not total_amount'],
      ['GRANT SELECT (patient_id, ...) ON patients', 'Minimum necessary PHI: only the columns billing needs'],
      ['GRANT USAGE ON SEQUENCE ...', 'Needed so INSERT can draw the next payment_id'],
      ['ALTER DEFAULT PRIVILEGES ...', 'Tables created later are automatically readable by auditor'],
      ['REVOKE INSERT ON transactions FROM billing_clerk', 'Takes one privilege away; others stay'],
      ['information_schema.role_table_grants', 'Standard catalog view to verify the result'],
    ],
    dialectSql: {
      postgres: `GRANT SELECT, INSERT ON payments TO billing_clerk;\nREVOKE INSERT ON payments FROM billing_clerk;\nSELECT has_table_privilege('amy', 'payments', 'INSERT');`,
      mysql: `GRANT SELECT, INSERT ON billing.payments TO 'billing_clerk';\nGRANT SELECT (patient_id, first_name, last_name) ON billing.patients TO 'billing_clerk';\nREVOKE INSERT ON billing.payments FROM 'billing_clerk';\nSHOW GRANTS FOR 'amy'@'%' USING 'billing_clerk';`,
      sqlserver: `GRANT SELECT, INSERT ON dbo.payments TO billing_clerk;\nGRANT SELECT ON dbo.patients (patient_id, first_name, last_name) TO billing_clerk;\nDENY DELETE ON dbo.invoices TO billing_clerk;   -- DENY beats any GRANT\nREVOKE INSERT ON dbo.payments FROM billing_clerk;`,
      oracle: `GRANT SELECT, INSERT ON billing.payments TO billing_clerk;\nGRANT UPDATE (status) ON billing.invoices TO billing_clerk;\nREVOKE INSERT ON billing.payments FROM billing_clerk;\nSELECT * FROM dba_tab_privs WHERE grantee = 'BILLING_CLERK';`,
      sqlite: `-- No GRANT/REVOKE. Options:\n-- 1) open the file read-only:  sqlite3 -readonly billing.db\n-- 2) the app checks a permissions table before running a statement\n-- 3) sqlite3_set_authorizer() callback in C to allow/deny per column`,
    },
    visual: { type: 'html', html: `<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:13px;min-width:520px;width:100%">
<tr><th style="text-align:left;padding:6px;border-bottom:1px solid var(--border)">Role</th><th style="padding:6px;border-bottom:1px solid var(--border)">patients</th><th style="padding:6px;border-bottom:1px solid var(--border)">invoices</th><th style="padding:6px;border-bottom:1px solid var(--border)">payments</th><th style="padding:6px;border-bottom:1px solid var(--border)">transactions</th></tr>
<tr><td style="padding:6px"><b>billing_clerk</b></td><td style="padding:6px;color:var(--yellow)">SELECT (4 cols)</td><td style="padding:6px;color:var(--green)">SELECT, UPDATE(status)</td><td style="padding:6px;color:var(--green)">SELECT, INSERT</td><td style="padding:6px"><span style="color:var(--green)">SELECT</span> <s style="color:var(--red)">INSERT</s> <span style="color:var(--muted)">(revoked)</span></td></tr>
<tr><td style="padding:6px"><b>practitioner</b></td><td style="padding:6px;color:var(--green)">SELECT</td><td style="padding:6px;color:var(--muted)">none</td><td style="padding:6px;color:var(--muted)">none</td><td style="padding:6px;color:var(--muted)">none</td></tr>
<tr><td style="padding:6px"><b>auditor</b></td><td style="padding:6px;color:var(--green)">SELECT</td><td style="padding:6px;color:var(--green)">SELECT</td><td style="padding:6px;color:var(--green)">SELECT</td><td style="padding:6px;color:var(--green)">SELECT</td></tr>
<tr><td style="padding:6px"><b>PUBLIC</b></td><td style="padding:6px;color:var(--red)">none</td><td style="padding:6px;color:var(--red)">none</td><td style="padding:6px;color:var(--red)">none</td><td style="padding:6px;color:var(--red)">none</td></tr>
</table><p style="font-size:12px;color:var(--muted)">Each cell is an ACL entry. Green = granted, yellow = column-level grant, struck out = revoked. Nobody has DELETE.</p></div>` },
    internals: `<p>Each table carries an ACL, for example <code>{billing_clerk=arw/owner}</code> where <code>r</code>=SELECT, <code>a</code>=INSERT, <code>w</code>=UPDATE, <code>d</code>=DELETE. GRANT and REVOKE just edit that list; they are instant and do not touch data. On every statement the planner checks the ACL of each table and column the query references, for the current role and all roles it inherits. A missing entry raises <code>permission denied for table ...</code> before any row is read.</p>
<p>Privileges are also checked on <b>views</b> and <b>functions</b>, which is how later lessons hide columns and rows.</p>`,
    mistakes: [
      { wrong: `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO billing_clerk;`, why: 'ALL includes DELETE, TRUNCATE and TRIGGER on every table, including patients. That breaks minimum-necessary access.', fix: `GRANT SELECT ON invoices, payments TO billing_clerk;\nGRANT INSERT ON payments TO billing_clerk;` },
      { wrong: `REVOKE SELECT ON patients FROM amy;\n-- amy can still read patients!`, why: 'amy never had a direct grant; she reads patients through her role billing_clerk (or through PUBLIC). REVOKE only removes what was granted to that exact grantee.', fix: `REVOKE billing_clerk FROM amy;\n-- or: REVOKE SELECT ON patients FROM billing_clerk;` },
      { wrong: `GRANT SELECT ON invoices TO team_lead WITH GRANT OPTION;`, why: 'The team lead can now hand out access to anyone, outside your review process.', fix: `GRANT SELECT ON invoices TO team_lead;` },
    ],
    rules: ['Grant the smallest privilege that does the job: SELECT before UPDATE, columns before whole tables.', 'REVOKE removes only what was granted to that grantee; check inherited roles and PUBLIC.', 'Avoid GRANT ALL and WITH GRANT OPTION.', 'Verify with information_schema or has_table_privilege(), do not assume.'],
    compare: `<table><tr><th>Statement</th><th>Effect</th></tr>
<tr><td>GRANT</td><td>Adds a permission</td></tr>
<tr><td>REVOKE</td><td>Removes a previously granted permission</td></tr>
<tr><td>DENY (SQL Server only)</td><td>Explicitly blocks, even if a role grants it</td></tr>
<tr><td>GRANT role TO user</td><td>Membership: user inherits the role's permissions</td></tr></table>`,
    realWorld: 'A new "payment poster" job at a billing company gets SELECT on invoices and INSERT on payments only. The compliance team runs a quarterly report from information_schema listing every grant on PHI tables and signs off on it.',
    tips: ['In PostgreSQL, run REVOKE ALL ON SCHEMA public FROM PUBLIC on new databases (versions before 15 let everyone create tables there).', 'Use \\dp tablename in psql to see a table\'s ACL.', 'Script your grants in version control, so the permission model is reviewable.'],
    deep: `<p><b>CASCADE</b>: if billing_clerk got a privilege WITH GRANT OPTION and passed it on, <code>REVOKE ... FROM billing_clerk CASCADE</code> also removes the dependent grants. Without CASCADE the revoke fails.</p>
<p><b>DENY vs REVOKE</b> in SQL Server: REVOKE removes an entry (the user might still get the right through another role); DENY adds a blocking entry that wins over all grants. PostgreSQL has no DENY: you design roles so the right is never granted.</p>
<p><b>Ownership</b>: the owner of a table always has all privileges and can grant them. Keep tables owned by a NOLOGIN owner role (<code>billing_owner</code>) that only migrations use.</p>`,
    tryIt: { prompt: 'Emulate GRANT/REVOKE with a permissions table, the way many applications on SQLite do. Revoke DELETE from billing_clerk (delete that row), then run the permission check again.', starter: `CREATE TABLE role_grants (
  role_name  TEXT, table_name TEXT, privilege TEXT,
  PRIMARY KEY (role_name, table_name, privilege)
);
INSERT INTO role_grants VALUES
  ('billing_clerk', 'invoices', 'SELECT'),
  ('billing_clerk', 'invoices', 'DELETE'),
  ('billing_clerk', 'payments', 'INSERT'),
  ('auditor',       'invoices', 'SELECT');

-- "Can billing_clerk DELETE from invoices?"
SELECT EXISTS (
  SELECT 1 FROM role_grants
  WHERE role_name = 'billing_clerk' AND table_name = 'invoices' AND privilege = 'DELETE'
) AS allowed;` },
    challenge: {
      level: 2,
      prompt: 'Fix the query: it should list the effective privileges after the REVOKEs, that is every granted row that was NOT revoked. Return role_name, table_name, privilege ordered by all three columns.',
      buggy: `WITH granted(role_name, table_name, privilege) AS (VALUES
  ('billing_clerk', 'invoices', 'SELECT'), ('billing_clerk', 'invoices', 'UPDATE'),
  ('billing_clerk', 'payments', 'SELECT'), ('billing_clerk', 'payments', 'INSERT'),
  ('billing_clerk', 'transactions', 'SELECT'), ('billing_clerk', 'transactions', 'INSERT'),
  ('auditor', 'invoices', 'SELECT'), ('auditor', 'payments', 'SELECT')
),
revoked(role_name, table_name, privilege) AS (VALUES
  ('billing_clerk', 'transactions', 'INSERT'),
  ('billing_clerk', 'invoices', 'UPDATE')
)
SELECT role_name, table_name, privilege FROM granted
UNION
SELECT role_name, table_name, privilege FROM revoked
ORDER BY role_name, table_name, privilege;`,
      solution: `WITH granted(role_name, table_name, privilege) AS (VALUES
  ('billing_clerk', 'invoices', 'SELECT'), ('billing_clerk', 'invoices', 'UPDATE'),
  ('billing_clerk', 'payments', 'SELECT'), ('billing_clerk', 'payments', 'INSERT'),
  ('billing_clerk', 'transactions', 'SELECT'), ('billing_clerk', 'transactions', 'INSERT'),
  ('auditor', 'invoices', 'SELECT'), ('auditor', 'payments', 'SELECT')
),
revoked(role_name, table_name, privilege) AS (VALUES
  ('billing_clerk', 'transactions', 'INSERT'),
  ('billing_clerk', 'invoices', 'UPDATE')
)
SELECT role_name, table_name, privilege FROM granted
EXCEPT
SELECT role_name, table_name, privilege FROM revoked
ORDER BY role_name, table_name, privilege;`,
      hints: ['UNION adds the revoked rows back instead of removing them.', 'You need "rows in granted but not in revoked".', 'Which set operator subtracts one result from another?', 'Replace UNION with EXCEPT.'],
      ordered: true,
    },
    quiz: [
      { q: 'amy is a member of billing_clerk, which has SELECT on patients. You run REVOKE SELECT ON patients FROM amy. Can amy still read patients?', options: ['No', 'Yes, through billing_clerk', 'Only the first row', 'Only if she reconnects'], answer: 1, why: 'REVOKE removes a direct grant only; the inherited privilege remains.' },
      { q: 'Which statement lets a billing clerk change invoice status but not the amount?', options: ['GRANT UPDATE ON invoices', 'GRANT UPDATE (status) ON invoices', 'GRANT ALTER ON invoices', 'GRANT SELECT (status) ON invoices'], answer: 1, why: 'Column-level UPDATE limits which columns can be changed.' },
      { q: 'What does WITH GRANT OPTION add?', options: ['Faster queries', 'The grantee may grant the privilege to others', 'Encryption', 'Automatic expiry'], answer: 1, why: 'Use it rarely: it lets access spread outside your control.' },
    ],
  },
  // ---------------------------------------------------------------- 03
  {
    id: 'security-03',
    goals: ['The principle of least privilege (and HIPAA "minimum necessary")', 'Designing roles around job tasks', 'Separating duties: the person who posts is not the person who approves', 'Running an access review to find unused privileges', 'Writing minimum-necessary queries and extracts'],
    concept: `<p><b>Least privilege</b> means: every user, role and program gets <b>only the access it needs to do its job, and nothing more</b>. Not "read access to everything just in case".</p>
<p>HIPAA says the same thing about PHI as <b>minimum necessary</b>: use and disclose only the smallest amount of patient information needed for the purpose.</p>
<p>In a billing database that means:</p>
<ul>
<li>A <b>billing clerk</b> needs invoices, payments and patient <i>names</i>, not allergies or dates of birth.</li>
<li>A <b>practitioner</b> needs clinical fields (allergies) for their patients, not payor contract rates.</li>
<li>An <b>auditor</b> may read almost everything but change nothing.</li>
<li>The <b>web application</b> account can run its queries, but cannot DROP tables or create users.</li>
<li>A <b>collections vendor</b> receives only overdue invoices, not the full patient table.</li>
</ul>
<p>Least privilege is not set once. Jobs change and rights pile up ("privilege creep"), so teams run regular <b>access reviews</b>: compare what each role <i>has</i> with what it <i>uses</i>, and revoke the rest.</p>`,
    why: 'Every extra permission is extra damage when an account is stolen, misused or buggy. Breach size is decided by what the compromised account could reach.',
    when: 'When designing roles, granting access to a new person or integration, preparing data extracts, and during every periodic access review.',
    analogy: 'A hotel key card opens only your room and the gym for the dates of your stay. The cleaning staff card opens rooms on one floor during the day shift. Nobody gets the master key "for convenience".',
    syntax: `-- Start from nothing\nREVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;\n-- Add exactly what the task needs\nGRANT SELECT (needed_columns) ON table TO task_role;\n-- Review regularly: granted but unused = revoke`,
    sql: `-- Access review: which granted privileges were not used in the last 90 days?
WITH granted(role_name, table_name, privilege) AS (VALUES
  ('billing_clerk', 'invoices',     'SELECT'),
  ('billing_clerk', 'payments',     'INSERT'),
  ('billing_clerk', 'patients',     'SELECT'),
  ('billing_clerk', 'charges',      'DELETE'),
  ('report_reader', 'patients',     'SELECT'),
  ('report_reader', 'invoices',     'SELECT')
),
last_used(role_name, table_name, privilege, used_on) AS (VALUES
  ('billing_clerk', 'invoices', 'SELECT', '2026-08-31'),
  ('billing_clerk', 'payments', 'INSERT', '2026-08-30'),
  ('billing_clerk', 'patients', 'SELECT', '2026-08-29'),
  ('report_reader', 'invoices', 'SELECT', '2026-08-15'),
  ('report_reader', 'patients', 'SELECT', '2026-02-10')
)
SELECT g.role_name, g.table_name, g.privilege,
       u.used_on AS last_used,
       'REVOKE ' || g.privilege || ' ON ' || g.table_name || ' FROM ' || g.role_name || ';' AS suggested_fix
FROM granted g
LEFT JOIN last_used u
  ON u.role_name = g.role_name AND u.table_name = g.table_name AND u.privilege = g.privilege
WHERE u.used_on IS NULL
   OR u.used_on < date('2026-09-01', '-90 days')
ORDER BY g.role_name, g.table_name;`,
    breakdown: [
      ['granted(...)', 'What each role is allowed to do (in PostgreSQL: information_schema.role_table_grants)'],
      ['last_used(...)', 'When each privilege was last exercised (from audit logs)'],
      ['LEFT JOIN last_used', 'Keep every grant, even those never used'],
      ['u.used_on IS NULL OR u.used_on < 90 days ago', 'Never used, or not used recently: candidates to revoke'],
      ["'REVOKE ' || ... || ';'", 'Generate the fix statement for the reviewer to approve'],
    ],
    visual: { type: 'er', tables: ['patients', 'invoices', 'payments', 'payors'] },
    dialectSql: {
      postgres: `REVOKE ALL ON DATABASE billing FROM PUBLIC;\nREVOKE ALL ON SCHEMA public FROM PUBLIC;\nGRANT CONNECT ON DATABASE billing TO billing_clerk;\nGRANT USAGE ON SCHEMA public TO billing_clerk;\nGRANT SELECT (patient_id, first_name, last_name) ON patients TO billing_clerk;\nGRANT SELECT ON invoices, payments TO billing_clerk;`,
      mysql: `-- Grant per table, never billing.* for app accounts\nGRANT SELECT ON billing.invoices TO 'billing_clerk';\nGRANT SELECT (patient_id, first_name, last_name) ON billing.patients TO 'billing_clerk';\nREVOKE ALL PRIVILEGES, GRANT OPTION FROM 'old_app'@'%';`,
      sqlserver: `CREATE ROLE billing_clerk;\nGRANT SELECT ON SCHEMA::billing TO billing_clerk;  -- schema-scoped\nDENY SELECT ON dbo.patients (date_of_birth, allergies, email) TO billing_clerk;`,
      oracle: `GRANT CREATE SESSION TO billing_clerk;\nGRANT SELECT ON billing.invoices TO billing_clerk;\n-- Privilege Analysis finds unused privileges:\n-- DBMS_PRIVILEGE_CAPTURE.CREATE_CAPTURE(...)`,
      sqlite: `-- Least privilege in SQLite = the app opens the file read-only when it only reads:\n-- sqlite3.connect('file:billing.db?mode=ro', uri=True)\n-- and exposes only minimum-necessary queries or views.`,
    },
    internals: `<p>Databases can tell you what was <i>granted</i> (catalogs such as <code>information_schema.role_table_grants</code>) but not what was <i>used</i>, unless you turn on auditing (pgAudit, SQL Server Audit, Oracle Unified Auditing or Privilege Analysis). An access review joins the two, exactly like the query above: a LEFT JOIN anti-pattern that finds grants without matching usage.</p>`,
    mistakes: [
      { wrong: `SELECT * FROM patients;  -- for a report that shows names only`, why: 'SELECT * pulls date_of_birth, email and allergies into the report, the export file, logs and caches. More PHI in more places.', fix: `SELECT patient_id, first_name, last_name FROM patients;` },
      { wrong: `-- One role 'staff' with every privilege, for everyone`, why: 'A front-desk account stolen by phishing can then modify payments and read clinical notes.', fix: `SELECT 'front_desk' AS role_name UNION ALL SELECT 'billing_clerk' UNION ALL SELECT 'auditor';` },
      { wrong: `-- The person who posts payments also approves write-offs and refunds`, why: 'Separation of duties: one person controlling both steps can hide theft (post a refund to themselves and approve it).', fix: `SELECT transaction_type, posted_by, COUNT(*) FROM transactions WHERE transaction_type IN ('REFUND', 'WRITE_OFF') GROUP BY transaction_type, posted_by;` },
    ],
    rules: ['Start from zero access and add; never start from "all" and subtract.', 'Grant columns and rows, not whole tables, when PHI is involved.', 'Separate duties: posting, approving and auditing belong to different roles.', 'Review access regularly and revoke unused privileges.', 'Minimum necessary also applies to queries and exports: select only needed columns and rows.'],
    compare: `<table><tr><th>Approach</th><th>Risk if account is compromised</th></tr>
<tr><td>Superuser for everything</td><td>Whole database, even the server</td></tr>
<tr><td>One broad "staff" role</td><td>All PHI and all billing data</td></tr>
<tr><td>Task roles + column grants</td><td>Only that job's data</td></tr>
<tr><td>Task roles + views + RLS</td><td>Only that job's data for that user's location</td></tr></table>`,
    realWorld: 'After a breach investigation, a common finding is "the reporting service account had write access to every table and nobody knew why." HITRUST and SOC 2 audits ask for evidence of quarterly access reviews like the query above.',
    tips: ['Give temporary elevated access with an expiry date (VALID UNTIL) and a ticket number.', 'Separate read-only and read-write application accounts; route reports through the read-only one.', 'Generated REVOKE statements should be reviewed by a person, not executed blindly.'],
    deep: `<p><b>Just-in-time access</b>: modern setups give nobody standing admin rights. An engineer requests access, gets a short-lived role for 1 hour (often through a tool like a privileged-access manager or IAM database auth), and every statement is logged. Standing privileges trend to zero.</p>
<p>Least privilege applies to the <b>database server</b> too: the database process should not run as root, should not be able to write outside its data directory, and features like <code>COPY ... TO PROGRAM</code> or <code>xp_cmdshell</code> should be restricted to superusers or disabled.</p>`,
    tryIt: { prompt: 'The front-desk scheduler only needs names and city to call patients with Open invoices. Compare the column count of SELECT * with this minimum-necessary query, then remove city too if the scheduler only phones people.', starter: `SELECT p.patient_id, p.first_name, p.last_name, p.city
FROM patients p
WHERE p.patient_id IN (SELECT patient_id FROM invoices WHERE status = 'Open')
ORDER BY p.patient_id;` },
    challenge: {
      level: 2,
      prompt: 'Minimum-necessary extract for a collections vendor. Their contract allows only Overdue invoices more than 60 days past due as of 2026-09-01, and only these columns: invoice_id, patient_id, due_date, total_amount and days_past_due (whole days between due_date and 2026-09-01). Order by days_past_due descending, then invoice_id.',
      solution: `SELECT invoice_id, patient_id, due_date, total_amount,
       CAST(julianday('2026-09-01') - julianday(due_date) AS INTEGER) AS days_past_due
FROM invoices
WHERE status = 'Overdue'
  AND julianday('2026-09-01') - julianday(due_date) > 60
ORDER BY days_past_due DESC, invoice_id;`,
      hints: ['Only the invoices table is needed: no patient names, no DOB.', 'Filter status = \'Overdue\'.', 'Days past due: julianday(\'2026-09-01\') - julianday(due_date); keep rows where it is > 60.', 'CAST(... AS INTEGER) AS days_past_due, then ORDER BY days_past_due DESC, invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'What does HIPAA "minimum necessary" mean for a SQL report?', options: ['Use as few tables as possible', 'Return only the PHI columns and rows the purpose requires', 'Run it at night', 'Encrypt the query text'], answer: 1, why: 'Least privilege applied to data use and disclosure.' },
      { q: 'An access review finds a role with DELETE on charges that has never used it. What should happen?', options: ['Keep it just in case', 'Revoke it after confirming it is not needed', 'Grant it to more roles', 'Nothing, DELETE is harmless'], answer: 1, why: 'Unused privileges only add risk.' },
      { q: 'Separation of duties means...', options: ['Tables live in separate schemas', 'No single person controls every step of a sensitive process', 'Each query runs on a separate server', 'Reads and writes use different indexes'], answer: 1, why: 'For example, posting a refund and approving it are different roles.' },
    ],
  },
  // ---------------------------------------------------------------- 04
  {
    id: 'security-04',
    goals: ['Use a view to expose only some columns and rows', 'Grant access to the view, not the base table', 'Views that join and pre-filter for a job function', 'Security pitfalls: leaky functions, security_barrier, definer vs invoker rights'],
    concept: `<p>A <b>view</b> is a saved SELECT that looks like a table. For security, it works like a <b>window</b>: users see only what the window shows.</p>
<ul>
<li><b>Hide columns</b>: a <code>billing_patients_v</code> view without <code>date_of_birth</code>, <code>email</code>, <code>allergies</code>.</li>
<li><b>Hide rows</b>: only non-void invoices, only one location's invoices.</li>
<li><b>Pre-join and simplify</b>: invoice + patient name + payor name, so clerks never need the raw tables.</li>
</ul>
<p>The key step happens in a server database: you <b>GRANT SELECT on the view</b> and give <b>no privileges on the base table</b>. The view reads the base table with its <i>owner's</i> rights, so the user can see the window but cannot go around it.</p>
<pre>REVOKE ALL ON patients FROM billing_clerk;
GRANT SELECT ON billing_patients_v TO billing_clerk;</pre>
<p>SQLite has views (runnable below) but no GRANT, so in SQLite a view is a convenience and a guide for the application, not an enforced wall.</p>`,
    why: 'Column grants get messy, and some rules ("only non-void invoices", "mask the email") cannot be expressed as privileges at all. A view packages the rule once, in the database.',
    when: 'When a job function needs a subset or a reshaped version of sensitive tables: billing clerks, report tools, external partners, BI dashboards.',
    analogy: 'The pharmacy pickup window. Patients get exactly their prescription through the window; they never walk into the storeroom where every medication is kept.',
    exampleTables: ['patients'],
    syntax: `CREATE VIEW view_name AS\nSELECT allowed_columns\nFROM base_table\nWHERE allowed_rows;\n-- server DBs:\nGRANT SELECT ON view_name TO role;  -- and nothing on base_table`,
    sql: `CREATE VIEW billing_patients_v AS
SELECT patient_id, first_name, last_name, city, primary_payor_id
FROM patients;

SELECT * FROM billing_patients_v WHERE patient_id <= 8;`,
    breakdown: [
      ['CREATE VIEW billing_patients_v AS', 'Saves the query under a name; no data is copied'],
      ['SELECT patient_id, first_name, last_name, city, primary_payor_id', 'Only the columns billing needs: DOB, email, allergies stay hidden'],
      ['FROM patients', 'The protected base table'],
      ['SELECT * FROM billing_patients_v', 'Even SELECT * through the view cannot reach hidden columns'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 720 230" width="100%" role="img" aria-label="A view exposes some columns of the patients table and hides PHI columns">
<g font-family="sans-serif" font-size="13">
<text x="20" y="22" fill="var(--muted)">patients (base table: no grant for billing_clerk)</text>
<g>
<rect x="20" y="35" width="84" height="34" fill="var(--panel2)" stroke="var(--green)"/><text x="62" y="57" fill="var(--text)" text-anchor="middle" font-size="11">patient_id</text>
<rect x="104" y="35" width="84" height="34" fill="var(--panel2)" stroke="var(--green)"/><text x="146" y="57" fill="var(--text)" text-anchor="middle" font-size="11">first_name</text>
<rect x="188" y="35" width="84" height="34" fill="var(--panel2)" stroke="var(--green)"/><text x="230" y="57" fill="var(--text)" text-anchor="middle" font-size="11">last_name</text>
<rect x="272" y="35" width="84" height="34" fill="var(--panel2)" stroke="var(--red)"/><text x="314" y="57" fill="var(--red)" text-anchor="middle" font-size="11">date_of_birth</text>
<rect x="356" y="35" width="70" height="34" fill="var(--panel2)" stroke="var(--red)"/><text x="391" y="57" fill="var(--red)" text-anchor="middle" font-size="11">gender</text>
<rect x="426" y="35" width="60" height="34" fill="var(--panel2)" stroke="var(--green)"/><text x="456" y="57" fill="var(--text)" text-anchor="middle" font-size="11">city</text>
<rect x="486" y="35" width="70" height="34" fill="var(--panel2)" stroke="var(--red)"/><text x="521" y="57" fill="var(--red)" text-anchor="middle" font-size="11">email</text>
<rect x="556" y="35" width="70" height="34" fill="var(--panel2)" stroke="var(--red)"/><text x="591" y="57" fill="var(--red)" text-anchor="middle" font-size="11">allergies</text>
<rect x="626" y="35" width="84" height="34" fill="var(--panel2)" stroke="var(--green)"/><text x="668" y="57" fill="var(--text)" text-anchor="middle" font-size="10">primary_payor_id</text>
</g>
<g stroke="var(--green)" stroke-width="1.5" fill="none" stroke-dasharray="4 3">
<path d="M62 69 L140 140"/><path d="M146 69 L225 140"/><path d="M230 69 L310 140"/><path d="M456 69 L395 140"/><path d="M668 69 L480 140"/>
</g>
<rect x="100" y="140" width="420" height="40" rx="8" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/>
<text x="310" y="165" fill="var(--text)" text-anchor="middle">billing_patients_v  (GRANT SELECT TO billing_clerk)</text>
<text x="310" y="210" fill="var(--muted)" text-anchor="middle">Red columns are unreachable for the clerk: not in the view, no grant on the table.</text>
</g></svg>` },
    dialectSql: {
      postgres: `CREATE VIEW billing_patients_v WITH (security_barrier) AS\nSELECT patient_id, first_name, last_name, city, primary_payor_id FROM patients;\nREVOKE ALL ON patients FROM billing_clerk;\nGRANT SELECT ON billing_patients_v TO billing_clerk;`,
      mysql: `CREATE SQL SECURITY DEFINER VIEW billing_patients_v AS\nSELECT patient_id, first_name, last_name, city, primary_payor_id FROM patients;\nGRANT SELECT ON billing.billing_patients_v TO 'billing_clerk';`,
      sqlserver: `CREATE VIEW dbo.billing_patients_v AS\nSELECT patient_id, first_name, last_name, city, primary_payor_id FROM dbo.patients;\nGO\nGRANT SELECT ON dbo.billing_patients_v TO billing_clerk;  -- ownership chaining reads the table`,
      oracle: `CREATE OR REPLACE VIEW billing_patients_v AS\nSELECT patient_id, first_name, last_name, city, primary_payor_id FROM patients\nWITH READ ONLY;\nGRANT SELECT ON billing_patients_v TO billing_clerk;`,
      sqlite: `CREATE VIEW billing_patients_v AS\nSELECT patient_id, first_name, last_name, city, primary_payor_id FROM patients;\n-- not enforced: anyone with the file can still read patients`,
    },
    internals: `<p>A view stores only its SELECT text. When you query it, the planner <b>inlines</b> the view definition into your query and optimizes the whole thing, so a view costs nothing extra. Permission checks work in two layers: your role needs SELECT on the <i>view</i>; the view's <i>owner</i> needs SELECT on the base table (definer rights). PostgreSQL 15+ also offers <code>security_invoker</code> views, which check the base table with the caller's rights instead, useful combined with row-level security.</p>
<p>Because of inlining, a cleverly written user function in the WHERE clause could be evaluated <i>before</i> the view's own filter and leak hidden rows through error messages. <code>WITH (security_barrier)</code> forces the view's filters to run first.</p>`,
    mistakes: [
      { wrong: `CREATE VIEW clerk_patients AS SELECT * FROM patients;`, why: 'SELECT * exposes every column, including new PHI columns added to patients later.', fix: `CREATE VIEW clerk_patients AS SELECT patient_id, first_name, last_name FROM patients;` },
      { wrong: `-- Created the view, but billing_clerk still has SELECT on patients\nGRANT SELECT ON clerk_patients TO billing_clerk;`, why: 'The view is only a wall if the base table is closed. With a grant on patients, the clerk just queries the table directly.', fix: `SELECT patient_id, first_name, last_name FROM patients;  -- plus: REVOKE ALL ON patients FROM billing_clerk` },
      { wrong: `CREATE VIEW active_invoices AS SELECT * FROM invoices WHERE status <> 'Void';\n-- then clerks INSERT a Void invoice through the view`, why: 'An updatable view without WITH CHECK OPTION accepts rows that fall outside its own filter.', fix: `CREATE VIEW active_invoices AS SELECT invoice_id, status, total_amount FROM invoices WHERE status <> 'Void';` },
    ],
    rules: ['List columns explicitly in security views; never SELECT *.', 'Grant on the view AND remove grants on the base table.', 'Use security_barrier (PostgreSQL) for views that filter rows for security.', 'Use WITH CHECK OPTION if users write through a filtered view.'],
    compare: `<table><tr><th>Tool</th><th>Hides columns</th><th>Hides rows</th><th>Can reshape / mask</th></tr>
<tr><td>Column GRANT</td><td>Yes</td><td>No</td><td>No</td></tr>
<tr><td>View</td><td>Yes</td><td>Yes (fixed filter)</td><td>Yes</td></tr>
<tr><td>Row-level security</td><td>No</td><td>Yes (per user)</td><td>No</td></tr>
<tr><td>Masking policy</td><td>Partially</td><td>No</td><td>Yes</td></tr></table>`,
    realWorld: 'BI tools like Tableau or Power BI connect with a reporting login that only sees a schema of reporting views, for example rpt.invoice_summary and rpt.payor_mix, never the raw patients table.',
    tips: ['Put security views in their own schema (api, rpt) and grant USAGE on that schema only.', 'Name views after their audience: billing_patients_v, auditor_ledger_v.', 'Document which view each role should use, so nobody asks for base-table access "because it is easier".'],
    deep: `<p><b>Views as an API</b>: many teams expose <i>only</i> views and functions to applications, never tables. The tables can then be refactored (split, renamed) while the views keep the old shape. PostgREST and similar tools build a whole REST API this way, with one PostgreSQL role per user type.</p>`,
    tryIt: { prompt: 'Create a view for practitioners that shows patient_id, the full name and allergies (clinically needed) but not email or date of birth. Query it for patients who have allergies.', starter: `CREATE VIEW clinical_patients_v AS
SELECT patient_id,
       first_name || ' ' || last_name AS patient_name,
       allergies
FROM patients;

SELECT * FROM clinical_patients_v
WHERE allergies IS NOT NULL
ORDER BY patient_id;` },
    challenge: {
      mode: 'state',
      level: 2,
      prompt: 'Create a view named clerk_open_invoices for billing clerks with exactly these columns: invoice_id, patient_name (first_name || \' \' || last_name), status, due_date, total_amount. It must include only invoices whose status is Open, Overdue or Partially Paid. No DOB, email or other PHI.',
      solution: `CREATE VIEW clerk_open_invoices AS
SELECT i.invoice_id,
       p.first_name || ' ' || p.last_name AS patient_name,
       i.status, i.due_date, i.total_amount
FROM invoices i
JOIN patients p ON p.patient_id = i.patient_id
WHERE i.status IN ('Open', 'Overdue', 'Partially Paid');`,
      check: `-- (an empty placeholder is created only if your view does not exist)
CREATE VIEW IF NOT EXISTS clerk_open_invoices AS SELECT NULL AS invoice_id WHERE 0;
SELECT * FROM clerk_open_invoices ORDER BY 1;`,
      hints: ['Start with CREATE VIEW clerk_open_invoices AS SELECT ...', 'The patient name lives in patients: JOIN it on patient_id.', 'Build the name with p.first_name || \' \' || p.last_name AS patient_name.', 'Filter WHERE i.status IN (\'Open\', \'Overdue\', \'Partially Paid\') and keep the column order invoice_id, patient_name, status, due_date, total_amount.'],
    },
    quiz: [
      { q: 'A clerk has SELECT on billing_patients_v and also SELECT on patients. Is the email column protected?', options: ['Yes, the view hides it', 'No, the clerk can query patients directly', 'Only in SQLite', 'Only if the view uses DISTINCT'], answer: 1, why: 'The base table must be closed for the view to be a real security layer.' },
      { q: 'Why avoid SELECT * in a security view?', options: ['It is slower', 'New columns added to the table would automatically become visible', 'Views cannot use *', 'It breaks indexes'], answer: 1, why: 'Explicit columns keep the exposure fixed and reviewable (PostgreSQL expands * at creation, but other engines and later re-creations may not).' },
    ],
  },
  // ---------------------------------------------------------------- 05
  {
    id: 'security-05',
    goals: ['What row-level security (RLS) is', 'Write policies with USING and WITH CHECK', 'Filter rows by the current user or a session setting', 'Emulate RLS in SQLite with a "current user" CTE', 'Pitfalls: owners bypass RLS, missing policies, connection pooling'],
    concept: `<p><b>Row-level security</b> (RLS) lets the database filter <b>rows</b> per user automatically. Two clerks can run the exact same <code>SELECT * FROM invoices</code> and each sees only the invoices of their own clinic.</p>
<p>You write a <b>policy</b>: a condition that every row must pass for this user.</p>
<pre>ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_isolation ON invoices
  USING (location_id = current_setting('app.location_id')::int);</pre>
<ul>
<li><b>USING</b>: which existing rows the user can see (SELECT) or touch (UPDATE, DELETE).</li>
<li><b>WITH CHECK</b>: which new or changed rows the user may write (INSERT, UPDATE). It stops a clerk from moving an invoice into another clinic.</li>
</ul>
<p>Once RLS is enabled, a table with <b>no matching policy returns zero rows</b>: RLS is deny-by-default.</p>
<p>PostgreSQL has <code>CREATE POLICY</code>, SQL Server has <i>security policies</i> with predicate functions, Oracle has <i>Virtual Private Database</i> (VPD). MySQL and SQLite have no RLS; you emulate it with views or with a "current user" filter that the application always applies, as the runnable examples below do.</p>`,
    why: 'A multi-clinic billing company must keep each clinic\'s patients separate, and practitioners should see only their own patients. Writing that WHERE clause in every query of every app is error-prone; RLS puts it in the database once.',
    when: 'Multi-tenant systems (one database, many clinics or customers), "my patients only" rules, and any case where the allowed rows depend on who is asking.',
    analogy: 'A mail room with personal pigeonholes. Everyone walks to the same wall (the same table), but your key opens only your own box. You do not even see what is inside the others.',
    syntax: `ALTER TABLE t ENABLE ROW LEVEL SECURITY;\nCREATE POLICY name ON t\n  [FOR SELECT | INSERT | UPDATE | DELETE | ALL]\n  [TO role]\n  USING (row_condition)\n  [WITH CHECK (new_row_condition)];`,
    dialect: 'postgres',
    sql: `-- Which clerk works at which location
CREATE TABLE staff_locations (username text, location_id int);
INSERT INTO staff_locations VALUES ('amy', 4), ('raj', 1), ('raj', 3);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;   -- applies to the table owner too

-- Clerks read only invoices of their own locations
CREATE POLICY clerk_read ON invoices
  FOR SELECT TO billing_clerk
  USING (location_id IN (SELECT location_id FROM staff_locations
                         WHERE username = current_user));

-- Clerks may update those invoices, but cannot move them to another location
CREATE POLICY clerk_update ON invoices
  FOR UPDATE TO billing_clerk
  USING      (location_id IN (SELECT location_id FROM staff_locations WHERE username = current_user))
  WITH CHECK (location_id IN (SELECT location_id FROM staff_locations WHERE username = current_user));

-- Auditors read everything
CREATE POLICY auditor_read ON invoices FOR SELECT TO auditor USING (true);

SET ROLE amy;
SELECT invoice_id, location_id, status FROM invoices;   -- only location 4 rows`,
    breakdown: [
      ['staff_locations', 'Mapping table: which user may see which location'],
      ['ENABLE ROW LEVEL SECURITY', 'Turns RLS on; without a matching policy, users see no rows'],
      ['FORCE ROW LEVEL SECURITY', 'Owners normally bypass RLS; FORCE applies it to them too'],
      ['USING (location_id IN (... current_user))', 'A hidden WHERE added to every query by billing_clerk members'],
      ['WITH CHECK (...)', 'Rejects updates that would move a row outside the user\'s locations'],
      ['USING (true)', 'Auditors see all rows'],
      ['SET ROLE amy; SELECT ...', 'Same query, filtered result: 15 invoices of location 4'],
    ],
    dialectSql: {
      postgres: `ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;\nCREATE POLICY clinic_isolation ON invoices\n  USING (location_id = current_setting('app.location_id')::int);\n-- the app sets it per request / transaction:\nSET LOCAL app.location_id = '4';`,
      sqlserver: `CREATE FUNCTION sec.fn_location(@location_id int)\nRETURNS TABLE WITH SCHEMABINDING AS\nRETURN SELECT 1 AS ok WHERE @location_id = CAST(SESSION_CONTEXT(N'location_id') AS int);\nGO\nCREATE SECURITY POLICY sec.clinic_filter\n  ADD FILTER PREDICATE sec.fn_location(location_id) ON dbo.invoices,\n  ADD BLOCK PREDICATE sec.fn_location(location_id) ON dbo.invoices AFTER UPDATE\n  WITH (STATE = ON);\nEXEC sp_set_session_context N'location_id', 4;`,
      oracle: `-- Virtual Private Database: a function returns the predicate text\nCREATE FUNCTION clinic_pred(schema_v VARCHAR2, obj VARCHAR2) RETURN VARCHAR2 AS\nBEGIN RETURN 'location_id = SYS_CONTEXT(''billing_ctx'', ''location_id'')'; END;\n/\nBEGIN DBMS_RLS.ADD_POLICY('BILLING', 'INVOICES', 'clinic_isolation', 'BILLING', 'clinic_pred'); END;\n/`,
      mysql: `-- No RLS: use a view that filters on a session variable or user name\nCREATE VIEW my_invoices AS\nSELECT i.* FROM invoices i\nJOIN staff_locations s ON s.location_id = i.location_id\nWHERE s.username = SUBSTRING_INDEX(CURRENT_USER(), '@', 1);`,
      sqlite: `-- No RLS: the app always joins a "current user" context\nWITH session_ctx AS (SELECT 4 AS location_id)\nSELECT i.* FROM invoices i JOIN session_ctx s ON s.location_id = i.location_id;`,
    },
    visual: { type: 'flow', steps: [
      ['amy runs: SELECT * FROM invoices', 'she wrote no WHERE clause'],
      ['Engine finds policies on invoices for amy\'s roles', 'clerk_read (billing_clerk)'],
      ['Policy USING is added as a hidden filter', 'WHERE location_id IN (4)'],
      ['Table scan: 48 invoices', 'every row is tested against the policy'],
      ['Result: 15 invoices', 'location 4 only; raj would get locations 1 and 3'],
    ] },
    internals: `<p>RLS is implemented in the query <b>rewriter / planner</b>: the policy expressions are ANDed into the query as security quals, like an automatic WHERE clause, and marked as <i>security barriers</i> so user functions cannot peek at rows before the policy filters them. Multiple permissive policies for the same command are ORed; <code>AS RESTRICTIVE</code> policies are ANDed on top.</p>
<p>Because the filter is part of the plan, an index on <code>location_id</code> makes RLS cheap. A policy with a slow subquery, on the other hand, slows down <i>every</i> query on that table.</p>`,
    mistakes: [
      { wrong: `ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;\n-- tested as the table owner: "it shows all rows, RLS is broken!"`, why: 'Table owners and superusers bypass RLS by default, so tests as the owner prove nothing, and an app connecting as the owner is not protected.', fix: `ALTER TABLE invoices FORCE ROW LEVEL SECURITY;\n-- and test with SET ROLE amy;` },
      { wrong: `-- Pooled connections: SET app.location_id = '4'; (session level)`, why: 'With a connection pool, the next request that borrows this connection may belong to another clinic and inherit location 4.', fix: `BEGIN;\nSET LOCAL app.location_id = '4';   -- reset automatically at COMMIT\nSELECT invoice_id FROM invoices;\nCOMMIT;` },
      { wrong: `CREATE POLICY clerk_all ON invoices USING (location_id = 4);\n-- UPDATE invoices SET location_id = 1 WHERE invoice_id = 17;  -- allowed!`, why: 'Without WITH CHECK (or with a policy that only covers SELECT), a user can write rows into another tenant\'s space.', fix: `CREATE POLICY clerk_all ON invoices\n  USING (location_id = 4) WITH CHECK (location_id = 4);` },
    ],
    rules: ['RLS is deny-by-default: no policy, no rows.', 'Owners bypass RLS unless you FORCE it; the app must not connect as the owner.', 'Use USING for reads and WITH CHECK for writes.', 'Index the columns used in policies.', 'Set per-request context with SET LOCAL inside a transaction when using pools.'],
    compare: `<table><tr><th></th><th>RLS policy</th><th>Filtered view</th><th>WHERE in app code</th></tr>
<tr><td>Enforced by</td><td>Database, every query</td><td>Database, if base table closed</td><td>Each developer</td></tr>
<tr><td>Per-user rows</td><td>Yes</td><td>Yes (with current_user)</td><td>Yes</td></tr>
<tr><td>Forgotten filter possible</td><td>No</td><td>No</td><td>Yes</td></tr>
<tr><td>Available in SQLite</td><td>No</td><td>Yes (not enforced)</td><td>Yes</td></tr></table>`,
    realWorld: 'SaaS billing platforms host hundreds of practices in one PostgreSQL database with a practice_id on every table and an RLS policy practice_id = current_setting(\'app.practice_id\'). A bug in one report cannot leak another practice\'s patients.',
    tips: ['Name the context setting with a prefix (app.location_id) to avoid clashes with real settings.', 'Test policies with an automated suite: for each role, assert which rows are visible.', 'Keep policy functions simple and STABLE; mark helper functions SECURITY DEFINER carefully.'],
    deep: `<p><b>Leaky side channels</b>: even with RLS, error messages, timing, unique-constraint violations ("duplicate key 17 already exists") and aggregate counts can reveal the existence of hidden rows. Sensitive systems combine RLS with careful error handling and do not expose raw database errors to users.</p>
<p><b>RLS vs separate databases</b>: one database per tenant gives the strongest isolation and easy per-tenant backup, but costs more to operate. RLS in a shared schema is cheaper and simpler to query across tenants for the vendor itself (with a bypass role).</p>`,
    tryIt: { prompt: 'RLS emulation in SQLite: the CTE session_ctx plays the role of "the logged-in user". Change the username to \'billing.raj\' and run again: the same query now returns other rows.', starter: `WITH session_ctx AS (SELECT 'billing.amy' AS username),
staff_locations(username, location_id) AS (VALUES
  ('billing.amy', 4),
  ('billing.raj', 1),
  ('billing.raj', 3)
)
SELECT i.invoice_id, i.location_id, i.status, i.total_amount
FROM invoices i
WHERE i.location_id IN (
  SELECT sl.location_id
  FROM staff_locations sl
  JOIN session_ctx s ON s.username = sl.username
)
ORDER BY i.invoice_id;` },
    challenge: {
      level: 3,
      prompt: 'Emulate an RLS policy for billing.raj. Using the session_ctx and staff_locations CTEs in the starter, return the invoices raj may see (his locations only) that are NOT Paid: invoice_id, location_id, status, total_amount, ordered by invoice_id. The location filter must come from the CTEs, not from hard-coded location ids.',
      starter: `WITH session_ctx AS (SELECT 'billing.raj' AS username),
staff_locations(username, location_id) AS (VALUES
  ('billing.amy', 4),
  ('billing.raj', 1),
  ('billing.raj', 3)
)
SELECT `,
      solution: `WITH session_ctx AS (SELECT 'billing.raj' AS username),
staff_locations(username, location_id) AS (VALUES
  ('billing.amy', 4),
  ('billing.raj', 1),
  ('billing.raj', 3)
)
SELECT i.invoice_id, i.location_id, i.status, i.total_amount
FROM invoices i
WHERE i.location_id IN (
        SELECT sl.location_id
        FROM staff_locations sl
        JOIN session_ctx s ON s.username = sl.username)
  AND i.status <> 'Paid'
ORDER BY i.invoice_id;`,
      hints: ['The "policy" is: location_id must be one of the current user\'s locations.', 'Get those locations with a subquery: staff_locations joined to session_ctx on username.', 'Use WHERE i.location_id IN (SELECT sl.location_id FROM staff_locations sl JOIN session_ctx s ON s.username = sl.username).', 'Add AND i.status <> \'Paid\' (the user\'s own filter) and ORDER BY i.invoice_id.'],
      ordered: true,
    },
    quiz: [
      { q: 'RLS is enabled on invoices but no policy applies to role front_desk. What does front_desk see?', options: ['All rows', 'No rows', 'An error', 'Only its own rows'], answer: 1, why: 'RLS is deny-by-default.' },
      { q: 'What is WITH CHECK for?', options: ['Filtering rows on SELECT', 'Validating new or changed rows on INSERT/UPDATE', 'Checking indexes', 'Checking passwords'], answer: 1, why: 'USING filters existing rows; WITH CHECK validates the rows being written.' },
      { q: 'Why is SET LOCAL preferred over SET for the tenant setting with a connection pool?', options: ['It is faster', 'It resets at the end of the transaction, so the next borrower does not inherit it', 'SET is not allowed', 'SET LOCAL encrypts the value'], answer: 1, why: 'Pooled connections are reused by different users.' },
    ],
  },
  // ---------------------------------------------------------------- 06
  {
    id: 'security-06',
    goals: ['What SQL injection is and why it happens', 'How \' OR \'1\'=\'1 turns a one-patient query into an all-patients query', 'UNION-based data theft and destructive injections', 'Why escaping by hand, denylists and client-side checks do not fix it', 'The real fix: parameters (next lesson), plus least privilege'],
    concept: `<p><b>SQL injection</b> happens when an application builds SQL by <b>gluing user input into the query text</b>, and the input contains SQL.</p>
<p>A patient-search screen does this (Python):</p>
<pre>name = request.args["last_name"]           # user input
sql = "SELECT patient_id, first_name, last_name, date_of_birth " \\
      "FROM patients WHERE last_name = '" + name + "'"
cursor.execute(sql)</pre>
<p>With the input <code>Smith</code> the query is fine. Now the attacker types:</p>
<pre>Smith' OR '1'='1</pre>
<p>The glued text becomes:</p>
<pre>SELECT ... FROM patients WHERE last_name = 'Smith' OR '1'='1'</pre>
<p>The quote in the input <b>closed the string early</b>, and <code>OR '1'='1'</code> became part of the SQL. <code>'1'='1'</code> is true for every row, so the screen now shows <b>every patient with date of birth</b>: a reportable HIPAA breach from one text box.</p>
<p>Worse inputs exist:</p>
<ul>
<li><code>x' UNION SELECT email, date_of_birth FROM patients --</code> reads other columns and tables (the <code>--</code> comments out the rest of the original query).</li>
<li><code>x'; DROP TABLE invoices; --</code> runs a second statement, if the driver allows multiple statements.</li>
<li>Blind injection asks yes/no questions through timing or error differences, one character at a time.</li>
</ul>
<p>The database cannot tell the difference: it receives one string of SQL and runs it. The fix is to <b>never let data become SQL text</b>, which is what parameterized queries do (next lesson).</p>`,
    why: 'Injection has been on the OWASP Top 10 for over twenty years and has caused many of the largest healthcare data breaches. Anyone writing SQL from application code must understand it.',
    when: 'Every time user-controlled text (form fields, URL parameters, file contents, API payloads, even data read back from the database) ends up in a SQL statement.',
    analogy: 'A form letter that says: "Please give the bearer the chart of patient ____." If a visitor writes "Smith, and also every other chart in the building" in the blank, a clerk who follows the text literally hands over everything. The blank should only ever hold a name, never new instructions.',
    syntax: `-- Vulnerable pattern (application code):\nsql = "... WHERE col = '" + user_input + "'"\n-- Input:   x' OR '1'='1\n-- Result:  ... WHERE col = 'x' OR '1'='1'`,
    sql: `-- Intended query for input:  Smith
-- SELECT patient_id, first_name, last_name, date_of_birth FROM patients WHERE last_name = 'Smith';   -> 1 row

-- The same code with input:  Smith' OR '1'='1
SELECT patient_id, first_name, last_name, date_of_birth
FROM patients
WHERE last_name = 'Smith' OR '1'='1';`,
    breakdown: [
      ["WHERE last_name = 'Smith", 'The application\'s opening quote plus the attacker\'s text'],
      ["' (from the input)", 'Closes the string literal early: from here on, input is parsed as SQL'],
      ["OR '1'='1", 'An always-true condition written by the attacker'],
      ["' (closing quote from the app)", 'The app\'s own closing quote completes \'1\' neatly, so the SQL is valid'],
      ['Result', 'All 25 patients with dates of birth instead of 1 row'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 720 250" width="100%" role="img" aria-label="String concatenation lets attacker input become SQL code">
<g font-family="monospace" font-size="13">
<text x="20" y="24" fill="var(--muted)" font-family="sans-serif">1. Query template in the app</text>
<rect x="20" y="34" width="680" height="32" rx="6" fill="var(--panel2)" stroke="var(--border)"/>
<text x="30" y="55" fill="var(--text)">... WHERE last_name = '</text><text x="222" y="55" fill="var(--yellow)">[ user input ]</text><text x="340" y="55" fill="var(--text)">'</text>
<text x="20" y="96" fill="var(--muted)" font-family="sans-serif">2. Attacker types</text>
<rect x="20" y="106" width="680" height="32" rx="6" fill="var(--panel2)" stroke="var(--red)"/>
<text x="30" y="127" fill="var(--red)">Smith' OR '1'='1</text>
<text x="20" y="168" fill="var(--muted)" font-family="sans-serif">3. What the database receives (it cannot tell data from code)</text>
<rect x="20" y="178" width="680" height="32" rx="6" fill="var(--panel2)" stroke="var(--red)" stroke-width="2"/>
<text x="30" y="199" fill="var(--text)">... WHERE last_name = 'Smith</text><text x="262" y="199" fill="var(--red)" font-weight="bold">' OR '1'='1</text><text x="358" y="199" fill="var(--text)">'</text>
<text x="400" y="199" fill="var(--red)" font-family="sans-serif">always TRUE: 25 patients leak</text>
<text x="20" y="238" fill="var(--muted)" font-family="sans-serif" font-size="12">Red = text that came from the user but is executed as SQL.</text>
</g></svg>` },
    internals: `<p>The database parser works on the final string. After concatenation there is no record of which characters came from the developer and which from the user, so the parser tokenizes the attacker's quote as the end of a literal and <code>OR</code> as a keyword. The query planner then happily optimizes the attacker's query. Nothing at the database level is "broken": the application sent the wrong SQL.</p>
<p>That is also why parameters work: with a prepared statement, the SQL text is parsed <b>before</b> the value arrives, and the value is sent separately as data. It can never be tokenized as SQL.</p>`,
    mistakes: [
      { wrong: `name = name.replace("'", "''")   # escape quotes by hand\nsql = "... WHERE last_name = '" + name + "'"`, why: 'Hand escaping misses cases: numeric fields without quotes (WHERE patient_id = 1 OR 1=1), backslash escaping in MySQL, different character sets, identifiers. One forgotten spot is enough.', fix: `cur.execute("SELECT ... FROM patients WHERE last_name = ?", (name,))`, fixDialect: true },
      { wrong: `if "DROP" in user_input or "--" in user_input:\n    reject()   # denylist`, why: 'Attackers bypass denylists with case changes, comments (DR/**/OP), encodings, or queries that never use the blocked words (OR 1=1 needs neither).', fix: `cur.execute("SELECT ... WHERE last_name = ?", (name,))   # plus allow-list validation of format`, fixDialect: true },
      { wrong: `// validated in the browser with JavaScript, so the server trusts it`, why: 'Attackers call the API directly and skip the browser entirely. Validation must happen on the server, and it is only defense in depth, not the fix.', fix: `-- server side: parameterized query + server-side validation`, fixDialect: true },
    ],
    rules: ['Never build SQL by concatenating user input.', 'Treat every input as hostile: form fields, headers, files, even values read back from the database.', 'Escaping and denylists are not a fix; parameters are.', 'Least privilege limits the damage: an app account without DROP cannot drop tables.', 'Never show raw database error messages to users.'],
    compare: `<table><tr><th>Injection type</th><th>Example input</th><th>Effect</th></tr>
<tr><td>Tautology</td><td><code>x' OR '1'='1</code></td><td>Returns all rows</td></tr>
<tr><td>UNION-based</td><td><code>x' UNION SELECT email, date_of_birth FROM patients --</code></td><td>Reads other columns / tables</td></tr>
<tr><td>Stacked queries</td><td><code>x'; DELETE FROM payments; --</code></td><td>Runs extra statements</td></tr>
<tr><td>Blind (boolean / time)</td><td><code>x' AND substr(email,1,1)='a' --</code></td><td>Extracts data bit by bit</td></tr>
<tr><td>Second order</td><td>Stored name <code>O'Brien' --</code> reused later</td><td>Triggers when stored data is concatenated</td></tr></table>`,
    realWorld: 'Automated scanners probe every public patient portal and billing login form for injection within hours of going live. Penetration tests for HIPAA and PCI compliance always include SQL injection checks, and a single finding usually blocks a release.',
    tips: ['Test your own search boxes with a single quote: if you get a database error, the query is probably concatenated.', 'Use static-analysis tools (Semgrep, Bandit, SonarQube, CodeQL) that flag string-built SQL.', 'A web application firewall helps, but it is a safety net, not a fix.'],
    deep: `<p><b>Why numbers are not safe either</b>: <code>"... WHERE patient_id = " + id</code> with <code>id = "1 OR 1=1"</code> needs no quotes at all. Converting to an integer in code first (<code>int(id)</code>) closes this case, but parameters close all of them.</p>
<p><b>Second-order injection</b>: a value is stored safely (with parameters) but later read back and concatenated into another query, for example a saved report filter. Data coming from your own database is still user data.</p>
<p><b>ORMs are not automatically safe</b>: raw-SQL escape hatches such as <code>Model.objects.raw("... " + x)</code>, <code>sequelize.query("..." + x)</code> or string-built <code>order_by</code> clauses reintroduce injection.</p>`,
    tryIt: { prompt: 'Compare the intended query with the injected one side by side. Then try the numeric version: WHERE patient_id = 2 OR 1=1 (no quotes needed).', starter: `SELECT 'intended: Smith' AS input, COUNT(*) AS rows_returned
FROM patients WHERE last_name = 'Smith'
UNION ALL
SELECT 'injected: Smith'' OR ''1''=''1', COUNT(*)
FROM patients WHERE last_name = 'Smith' OR '1'='1';` },
    challenge: {
      level: 3,
      prompt: 'Play the attacker (in a safe sandbox). The search screen runs: SELECT first_name, last_name FROM patients WHERE last_name = \'<input>\'. Write the exact SQL the database receives when the input is: zzz\' UNION SELECT email, date_of_birth FROM patients WHERE email IS NOT NULL -- . Run it to see the leaked emails and birth dates.',
      solution: `SELECT first_name, last_name FROM patients WHERE last_name = 'zzz' UNION SELECT email, date_of_birth FROM patients WHERE email IS NOT NULL --'`,
      hints: ['Start from the template and paste the input where <input> is, keeping the app\'s own quotes.', 'The input\'s first quote closes \'zzz\'. Everything after it is SQL.', 'The app\'s closing quote ends up after -- so it becomes part of a comment.', 'SELECT first_name, last_name FROM patients WHERE last_name = \'zzz\' UNION SELECT email, date_of_birth FROM patients WHERE email IS NOT NULL --\''],
    },
    quiz: [
      { q: 'Input: Smith\' OR \'1\'=\'1. Why does the query return all patients?', options: ['The index is ignored', 'The quote ends the string and OR \'1\'=\'1\' is always true', 'Smith matches everyone', 'SQLite ignores WHERE'], answer: 1, why: 'The input changed the structure of the query.' },
      { q: 'Which is the real fix for SQL injection?', options: ['Remove the word DROP from input', 'Escape quotes by hand', 'Parameterized queries (bound values)', 'Client-side validation'], answer: 2, why: 'Values are sent separately from the SQL text and are never parsed as SQL.' },
      { q: 'Why does least privilege matter for injection?', options: ['It prevents injection', 'It limits what an injected query can do', 'It speeds up queries', 'It is not related'], answer: 1, why: 'An app account without DELETE or DROP cannot be used to delete or drop, even when injected.' },
    ],
  },
  // ---------------------------------------------------------------- 07
  {
    id: 'security-07',
    goals: ['What a parameterized (prepared) query is', 'Placeholder styles: ?, $1, :name, @name', 'Write safe queries from Python, Node.js, Java and C#', 'What cannot be a parameter (table and column names) and how to handle it with allow-lists', 'Extra benefits: plan reuse and correct typing'],
    concept: `<p>A <b>parameterized query</b> sends the SQL text and the values <b>separately</b>. The SQL contains <b>placeholders</b> where values go; the values travel next to it, never inside it.</p>
<pre>SQL text:  SELECT patient_id, first_name, last_name FROM patients WHERE last_name = ?
values:    ["Smith' OR '1'='1"]</pre>
<p>The database parses the SQL text first, with the placeholder as a hole for exactly one value. Then it fills the hole. Whatever the value contains (quotes, OR, --, semicolons), it is just a string to compare with <code>last_name</code>. The injection from the previous lesson simply finds no patient with that strange last name.</p>
<p>The same safe query in four languages:</p>
<pre># Python (sqlite3 uses ?, psycopg uses %s)
cur.execute(
    "SELECT patient_id, first_name, last_name FROM patients "
    "WHERE last_name = ? AND date_of_birth = ?",
    (last_name, dob))

// Node.js (pg uses $1, $2)
const res = await pool.query(
  "SELECT patient_id, first_name, last_name FROM patients WHERE last_name = $1 AND date_of_birth = $2",
  [lastName, dob]);

// Java (JDBC)
PreparedStatement ps = conn.prepareStatement(
  "SELECT patient_id, first_name, last_name FROM patients WHERE last_name = ? AND date_of_birth = ?");
ps.setString(1, lastName);
ps.setDate(2, java.sql.Date.valueOf(dob));
ResultSet rs = ps.executeQuery();

// C# (ADO.NET / SqlClient uses @names)
using var cmd = new SqlCommand(
  "SELECT patient_id, first_name, last_name FROM patients WHERE last_name = @last AND date_of_birth = @dob", conn);
cmd.Parameters.Add("@last", SqlDbType.NVarChar, 100).Value = lastName;
cmd.Parameters.Add("@dob", SqlDbType.Date).Value = dob;</pre>
<p>Placeholders can stand only for <b>values</b>. Table names, column names, sort direction and keywords cannot be parameters. For those, use an <b>allow-list</b>: map the user's choice to one of a few fixed SQL fragments in code.</p>`,
    why: 'It is the one fix that closes SQL injection completely for values, and it also makes queries faster (the plan can be reused) and types correct (dates stay dates).',
    when: 'Always, for every value that is not a constant written by the developer. There is no "this input is safe enough" exception.',
    analogy: 'A pre-printed lab requisition form with boxes. The lab reads the form layout first, then the patient name box. If someone writes "and also run every test" in the name box, it is just a very odd patient name, not a new instruction.',
    syntax: `-- placeholder styles by driver / database\nWHERE last_name = ?          -- SQLite, JDBC, ODBC, MySQL drivers\nWHERE last_name = $1         -- PostgreSQL (libpq, node-postgres)\nWHERE last_name = :last_name -- Oracle, SQLAlchemy, SQLite named\nWHERE last_name = @last_name -- SQL Server (ADO.NET)`,
    dialect: 'postgres',
    sql: `-- Server-side prepared statement in PostgreSQL
PREPARE find_patient(text, date) AS
  SELECT patient_id, first_name, last_name, city
  FROM patients
  WHERE last_name = $1 AND date_of_birth = $2;

EXECUTE find_patient('Garcia', '1951-12-18');          -- patients 1 and 25
EXECUTE find_patient('Smith'' OR ''1''=''1', '1958-03-18');  -- 0 rows: just a strange name

DEALLOCATE find_patient;`,
    breakdown: [
      ['PREPARE find_patient(text, date) AS', 'Parse and plan the statement once, with typed holes'],
      ['WHERE last_name = $1 AND date_of_birth = $2', 'Placeholders: positions for values, not SQL text'],
      ["EXECUTE find_patient('Garcia', '1951-12-18')", 'Send only the values; the SQL is already fixed'],
      ["EXECUTE find_patient('Smith'' OR ''1''=''1', ...)", 'The injection attempt is compared as one text value: no match'],
      ['DEALLOCATE', 'Free the prepared statement (drivers do this for you)'],
    ],
    dialectSql: {
      postgres: `PREPARE find_patient(text) AS SELECT * FROM patients WHERE last_name = $1;\nEXECUTE find_patient('Smith');`,
      mysql: `PREPARE find_patient FROM 'SELECT * FROM patients WHERE last_name = ?';\nSET @name = 'Smith';\nEXECUTE find_patient USING @name;\nDEALLOCATE PREPARE find_patient;`,
      sqlserver: `EXEC sp_executesql\n  N'SELECT * FROM patients WHERE last_name = @last',\n  N'@last nvarchar(100)',\n  @last = N'Smith';`,
      oracle: `-- PL/SQL bind variables\nVARIABLE last VARCHAR2(100)\nEXEC :last := 'Smith';\nSELECT * FROM patients WHERE last_name = :last;\n-- dynamic SQL: EXECUTE IMMEDIATE '... WHERE last_name = :1' USING v_last;`,
      sqlite: `-- C API: sqlite3_prepare_v2("... WHERE last_name = ?1") then sqlite3_bind_text(stmt, 1, name, ...)\n-- Python: cur.execute("SELECT * FROM patients WHERE last_name = ?", (name,))`,
    },
    visual: { type: 'html', html: `<svg viewBox="0 0 720 230" width="100%" role="img" aria-label="Request to app to parameterized query to database: SQL text and values travel separately">
<defs><marker id="sec7arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker></defs>
<g font-family="sans-serif" font-size="13">
<rect x="10" y="80" width="120" height="60" rx="8" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="70" y="105" fill="var(--text)" text-anchor="middle">HTTP request</text><text x="70" y="124" fill="var(--red)" text-anchor="middle" font-size="11">name=Smith' OR ...</text>
<rect x="170" y="80" width="130" height="60" rx="8" fill="var(--panel2)" stroke="var(--accent)"/>
<text x="235" y="105" fill="var(--text)" text-anchor="middle">Application</text><text x="235" y="124" fill="var(--muted)" text-anchor="middle" font-size="11">validates, binds</text>
<rect x="350" y="30" width="200" height="50" rx="8" fill="var(--panel2)" stroke="var(--green)"/>
<text x="450" y="51" fill="var(--green)" text-anchor="middle">SQL text (fixed)</text><text x="450" y="69" fill="var(--text)" text-anchor="middle" font-size="11" font-family="monospace">... WHERE last_name = $1</text>
<rect x="350" y="140" width="200" height="50" rx="8" fill="var(--panel2)" stroke="var(--yellow)"/>
<text x="450" y="161" fill="var(--yellow)" text-anchor="middle">Values (data only)</text><text x="450" y="179" fill="var(--text)" text-anchor="middle" font-size="11" font-family="monospace">$1 = "Smith' OR '1'='1"</text>
<rect x="600" y="80" width="110" height="60" rx="8" fill="var(--panel2)" stroke="var(--purple)"/>
<text x="655" y="105" fill="var(--text)" text-anchor="middle">Database</text><text x="655" y="124" fill="var(--muted)" text-anchor="middle" font-size="11">parse, then bind</text>
<g stroke="var(--muted)" stroke-width="1.5" fill="none" marker-end="url(#sec7arrow)">
<path d="M130 110 L168 110"/><path d="M300 100 L348 58"/><path d="M300 120 L348 162"/><path d="M550 55 L598 98"/><path d="M550 165 L598 122"/>
</g>
<text x="360" y="222" fill="var(--muted)" text-anchor="middle" font-size="12">Two separate channels: the value can never be parsed as SQL. Result: 0 rows.</text>
</g></svg>` },
    internals: `<p>In the PostgreSQL wire protocol a parameterized query uses the <b>extended query protocol</b>: a <i>Parse</i> message carries the SQL text with <code>$1</code>, a <i>Bind</i> message carries the values in a separate field (text or binary), then <i>Execute</i>. SQLite does the same through <code>sqlite3_prepare_v2</code> + <code>sqlite3_bind_*</code>. The value is placed into the already-compiled bytecode as a register; there is no second parse.</p>
<p>Because the text is identical for every call, the server can <b>cache the plan</b> (PostgreSQL prepared statements, SQL Server plan cache, Oracle shared pool). Concatenated SQL produces a new text for every value, which fills the plan cache with one-off plans.</p>
<p>Some drivers emulate parameters client-side (older PHP PDO default, some MySQL drivers) by escaping values into the text. That is still safe when done by the driver, but server-side prepares are preferred.</p>`,
    mistakes: [
      { wrong: `cur.execute("SELECT * FROM patients WHERE last_name = '%s'" % name)`, why: 'Python string formatting is still concatenation, just with nicer syntax. f-strings and template literals are the same trap.', fix: `cur.execute("SELECT * FROM patients WHERE last_name = ?", (name,))` },
      { wrong: `cur.execute("SELECT * FROM invoices ORDER BY ?", (sort_col,))`, why: 'Placeholders are values: this sorts by a constant string, not by the column. Developers then fall back to concatenation, which is injectable.', fix: `ALLOWED = {"date": "invoice_date", "amount": "total_amount"}\ncol = ALLOWED.get(sort_key, "invoice_date")\ncur.execute(f"SELECT * FROM invoices ORDER BY {col}")   # col comes only from the allow-list` },
      { wrong: `cur.execute("SELECT * FROM invoices WHERE status IN (?)", (",".join(statuses),))`, why: 'One placeholder is one value: this compares status with the single string "Open,Overdue".', fix: `marks = ",".join("?" * len(statuses))\ncur.execute(f"SELECT * FROM invoices WHERE status IN ({marks})", statuses)` },
    ],
    rules: ['Every value from outside the code goes through a placeholder.', 'Placeholders replace values only, never identifiers or keywords.', 'For dynamic column names or sort order, map input through an allow-list.', 'For IN lists, generate one placeholder per value (or pass an array: = ANY($1) in PostgreSQL).', 'f-strings, % formatting and template literals are concatenation too.'],
    compare: `<table><tr><th></th><th>Concatenation</th><th>Parameters</th></tr>
<tr><td>Injection</td><td>Possible</td><td>Impossible for values</td></tr>
<tr><td>Plan reuse</td><td>New plan per value</td><td>Same plan reused</td></tr>
<tr><td>Types</td><td>Everything becomes text</td><td>Dates, numbers, NULL sent properly</td></tr>
<tr><td>O'Brien in a name</td><td>Syntax error</td><td>Just works</td></tr></table>`,
    realWorld: 'Patient look-up in a registration system: last name + date of birth from the front-desk form, always bound as parameters. Code review checklists at healthcare software vendors reject any SQL built with + or format() on user values.',
    tips: ['Names like O\'Brien are a free test: if they break your app, you are concatenating.', 'In PostgreSQL pass arrays: WHERE status = ANY($1) with one array parameter.', 'Log the SQL text and parameter names, but be careful logging parameter values: they may contain PHI.'],
    deep: `<p><b>Dynamic SQL inside the database</b> needs the same discipline: PL/pgSQL <code>EXECUTE format('SELECT * FROM %I WHERE id = $1', tbl) USING v_id</code> (<code>%I</code> quotes identifiers safely, <code>USING</code> binds values), T-SQL <code>sp_executesql</code> with a parameter list plus <code>QUOTENAME()</code> for identifiers, Oracle <code>EXECUTE IMMEDIATE ... USING</code> plus <code>DBMS_ASSERT</code>.</p>
<p><b>Generic plans</b>: after several executions PostgreSQL may switch a prepared statement to a generic plan that ignores the actual value. For very skewed data (one location with 90% of invoices) that plan can be slow; <code>plan_cache_mode</code> controls it.</p>`,
    tryIt: { prompt: 'A bound parameter compares the whole input as one value. The first query is what the database effectively evaluates with a parameter (the quotes are data), the second is what concatenation produces. Compare the counts.', starter: `SELECT 'parameterized' AS how, COUNT(*) AS rows_returned
FROM patients
WHERE last_name = 'Smith'' OR ''1''=''1'
UNION ALL
SELECT 'concatenated', COUNT(*)
FROM patients
WHERE last_name = 'Smith' OR '1'='1';` },
    challenge: {
      level: 2,
      prompt: 'Emulate a parameterized identity check. The params CTE in the starter plays the role of the bound values (:p_last_name, :p_dob). Return every patient matching both values with patient_id, first_name, last_name, city and the number of invoices they have (0 if none). Use the CTE columns, not literal values, in your WHERE / JOIN. Order by patient_id.',
      starter: `WITH params(p_last_name, p_dob) AS (VALUES ('Garcia', '1951-12-18'))
SELECT `,
      solution: `WITH params(p_last_name, p_dob) AS (VALUES ('Garcia', '1951-12-18'))
SELECT p.patient_id, p.first_name, p.last_name, p.city, COUNT(i.invoice_id) AS invoice_count
FROM patients p
JOIN params prm ON p.last_name = prm.p_last_name AND p.date_of_birth = prm.p_dob
LEFT JOIN invoices i ON i.patient_id = p.patient_id
GROUP BY p.patient_id, p.first_name, p.last_name, p.city
ORDER BY p.patient_id;`,
      hints: ['Join patients to params on both last_name and date_of_birth.', 'LEFT JOIN invoices so patients without invoices still appear.', 'COUNT(i.invoice_id) counts only matched invoices (0 when none).', 'GROUP BY the patient columns and ORDER BY p.patient_id. (Two records match: patient 1 and its duplicate 25.)'],
      ordered: true,
    },
    quiz: [
      { q: 'Which of these can be a bound parameter?', options: ['A table name', 'A column in ORDER BY', 'The value compared with last_name', 'The keyword DESC'], answer: 2, why: 'Placeholders stand for values only; identifiers and keywords need an allow-list.' },
      { q: 'Which placeholder style does node-postgres (pg) use?', options: ['?', '$1', '@p1', '%s'], answer: 1, why: 'PostgreSQL numbers its parameters: $1, $2, ...' },
      { q: 'Is cur.execute(f"... WHERE id = {user_id}") parameterized?', options: ['Yes, f-strings are safe', 'No, it is string concatenation', 'Only in Python 3', 'Only for integers'], answer: 1, why: 'The value is inserted into the SQL text before the database sees it.' },
    ],
  },
  // ---------------------------------------------------------------- 08
  {
    id: 'security-08',
    goals: ['Encryption in transit, at rest, and at the column level', 'Hashing vs encryption vs masking vs tokenization', 'Mask emails, names and dates of birth with substr and ||', 'Dynamic masking (per user at query time) vs static masking (de-identified copies)', 'HIPAA de-identification basics'],
    concept: `<p>Access control decides <i>who</i> can read data. Encryption and masking decide <i>what they see</i> and protect data when other controls fail.</p>
<ul>
<li><b>Encryption in transit</b>: TLS between application and database, so nobody on the network can read patient data. Turn it on and require it (<code>sslmode=verify-full</code>).</li>
<li><b>Encryption at rest</b>: data files and backups are encrypted on disk (TDE in SQL Server/Oracle, encrypted volumes, SQLCipher for SQLite). A stolen disk or backup file is useless without the key.</li>
<li><b>Column-level encryption</b>: a single column (SSN, member ID) is stored encrypted and only apps holding the key can decrypt it. Even a DBA sees ciphertext.</li>
<li><b>Hashing</b>: one-way. Right for passwords (with bcrypt/argon2, never plain SHA) and for pseudonymous keys used to link records.</li>
<li><b>Masking</b>: show a <b>partial or fake</b> value: <code>m***@mail.com</code>, <code>1951-**-**</code>, <code>M. Garcia</code>. The real value still exists; the viewer just does not need it.</li>
</ul>
<p>Masking with plain SQL string functions:</p>
<pre>substr(email, 1, 1) || '***' || substr(email, instr(email, '@'))   -- m***@mail.com
substr(date_of_birth, 1, 4) || '-**-**'                           -- 1951-**-**</pre>
<p><b>Dynamic masking</b> applies at query time depending on who asks (a view or a masking policy). <b>Static masking</b> permanently rewrites a copy of the data, for example for a test or training database, which must never contain real PHI.</p>`,
    why: 'Billing staff, developers and analysts rarely need full identifiers. Masking gives them what they need; encryption protects the rest if an account, disk or backup leaks. HIPAA treats properly encrypted lost data very differently from unencrypted data in breach rules.',
    when: 'Screens and reports for staff who only need partial identifiers, exports to vendors, test/dev copies of production data, and any column holding SSNs, member IDs, emails or dates of birth.',
    analogy: 'A pharmacy receipt prints "Card ****4821": enough to recognize your card, useless to a thief. Encryption is the locked safe for the full number; masking is the receipt.',
    exampleSql: `SELECT patient_id, first_name, last_name, date_of_birth, email FROM patients WHERE patient_id <= 6`,
    syntax: `-- partial masking\nsubstr(col, 1, n) || '***' || ...\n-- conditional: show full value only to some roles\nCASE WHEN :role = 'practitioner' THEN col ELSE masked_expr END`,
    sql: `SELECT patient_id,
       first_name,
       substr(last_name, 1, 1) || '.'                               AS last_initial,
       substr(date_of_birth, 1, 4) || '-**-**'                     AS dob_masked,
       CAST((julianday('2026-09-01') - julianday(date_of_birth)) / 365.25 AS INTEGER) AS age,
       substr(email, 1, 1) || '***' || substr(email, instr(email, '@')) AS email_masked
FROM patients
ORDER BY patient_id
LIMIT 10;`,
    breakdown: [
      ["substr(last_name, 1, 1) || '.'", 'Keep only the initial: Garcia becomes G.'],
      ["substr(date_of_birth, 1, 4) || '-**-**'", 'Keep the year only; month and day are hidden'],
      ['CAST((julianday(...) - julianday(date_of_birth)) / 365.25 AS INTEGER)', 'Often the age is all a report needs, not the birth date'],
      ["substr(email, 1, 1) || '***' || substr(email, instr(email, '@'))", 'First letter + *** + everything from @: m***@mail.com'],
      ['NULL emails', 'substr(NULL) is NULL and NULL || anything is NULL, so missing emails stay NULL'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 720 240" width="100%" role="img" aria-label="Masking pipeline: stored encrypted data, access check, masking function, masked output per role">
<defs><marker id="sec8arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker></defs>
<g font-family="sans-serif" font-size="13">
<rect x="10" y="85" width="140" height="70" rx="8" fill="var(--panel2)" stroke="var(--purple)"/>
<text x="80" y="108" fill="var(--text)" text-anchor="middle">Disk / backup</text><text x="80" y="126" fill="var(--muted)" text-anchor="middle" font-size="11">encrypted at rest</text><text x="80" y="143" fill="var(--muted)" text-anchor="middle" font-size="11">(TDE, SQLCipher)</text>
<rect x="190" y="85" width="140" height="70" rx="8" fill="var(--panel2)" stroke="var(--blue)"/>
<text x="260" y="108" fill="var(--text)" text-anchor="middle">Query engine</text><text x="260" y="126" fill="var(--muted)" text-anchor="middle" font-size="11">real values in memory</text>
<rect x="370" y="85" width="140" height="70" rx="8" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/>
<text x="440" y="108" fill="var(--text)" text-anchor="middle">Masking view /</text><text x="440" y="126" fill="var(--text)" text-anchor="middle">policy by role</text>
<rect x="560" y="20" width="150" height="56" rx="8" fill="var(--panel2)" stroke="var(--green)"/>
<text x="635" y="42" fill="var(--green)" text-anchor="middle">practitioner</text><text x="635" y="62" fill="var(--text)" text-anchor="middle" font-size="11" font-family="monospace">1951-12-18</text>
<rect x="560" y="92" width="150" height="56" rx="8" fill="var(--panel2)" stroke="var(--yellow)"/>
<text x="635" y="114" fill="var(--yellow)" text-anchor="middle">billing_clerk</text><text x="635" y="134" fill="var(--text)" text-anchor="middle" font-size="11" font-family="monospace">1951-**-** / m***@mail.com</text>
<rect x="560" y="164" width="150" height="56" rx="8" fill="var(--panel2)" stroke="var(--red)"/>
<text x="635" y="186" fill="var(--red)" text-anchor="middle">test database</text><text x="635" y="206" fill="var(--text)" text-anchor="middle" font-size="11" font-family="monospace">1951-01-01 / fake</text>
<g stroke="var(--muted)" stroke-width="1.5" fill="none" marker-end="url(#sec8arrow)">
<path d="M150 120 L188 120"/><path d="M330 120 L368 120"/><path d="M510 105 L558 50"/><path d="M510 120 L558 120"/><path d="M510 135 L558 190"/>
</g>
<text x="170" y="112" fill="var(--muted)" font-size="10" text-anchor="middle">TLS</text>
</g></svg>` },
    dialectSql: {
      postgres: `-- pgcrypto: column-level encryption (key supplied by the app, not stored in the DB)\nCREATE EXTENSION IF NOT EXISTS pgcrypto;\nUPDATE patients SET email_enc = pgp_sym_encrypt(email, $1);\nSELECT pgp_sym_decrypt(email_enc, $1) FROM patients WHERE patient_id = 1;\n-- masking: a view (or the postgresql_anonymizer extension)`,
      sqlserver: `-- Dynamic Data Masking: applied at query time for users without UNMASK\nALTER TABLE dbo.patients ALTER COLUMN email ADD MASKED WITH (FUNCTION = 'email()');\nALTER TABLE dbo.patients ALTER COLUMN date_of_birth ADD MASKED WITH (FUNCTION = 'default()');\nGRANT UNMASK ON dbo.patients(date_of_birth) TO practitioner;\n-- Always Encrypted: the client driver encrypts; the server never sees the key`,
      oracle: `BEGIN\n  DBMS_REDACT.ADD_POLICY(\n    object_schema => 'BILLING', object_name => 'PATIENTS', policy_name => 'mask_email',\n    column_name => 'EMAIL', function_type => DBMS_REDACT.REGEXP,\n    expression => 'SYS_CONTEXT(''USERENV'',''SESSION_USER'') <> ''DR_OKAFOR''',\n    regexp_pattern => DBMS_REDACT.RE_PATTERN_EMAIL_ADDRESS,\n    regexp_replace_string => DBMS_REDACT.RE_REDACT_EMAIL_NAME);\nEND;\n/`,
      mysql: `-- MySQL Enterprise has mask_inner()/mask_outer(); community edition: views\nCREATE VIEW patients_masked AS\nSELECT patient_id, CONCAT(LEFT(email, 1), '***', SUBSTRING(email, LOCATE('@', email))) AS email_masked\nFROM patients;\n-- AES_ENCRYPT(value, key) / AES_DECRYPT for column encryption`,
      sqlite: `SELECT substr(email, 1, 1) || '***' || substr(email, instr(email, '@')) AS email_masked\nFROM patients;\n-- at rest: SQLCipher or the SQLite Encryption Extension (SEE)`,
    },
    internals: `<p>Masking in a view is just an expression evaluated per row after the row is read: cheap, but <b>the real value still passes through the engine</b>. Anyone who can query the base table, or filter on it (<code>WHERE date_of_birth = '1951-12-18'</code> through a view that exposes the column in WHERE), may still infer it. SQL Server's Dynamic Data Masking has exactly this weakness: masked users can still filter by the real value, so it is a convenience layer, not strong security.</p>
<p>Real encryption changes what is stored: <code>pgp_sym_encrypt</code> writes ciphertext bytes, so indexes and comparisons on the plain value no longer work (you index a keyed hash instead, if you need lookups).</p>`,
    mistakes: [
      { wrong: `-- Store the encryption key in a table next to the data\nSELECT pgp_sym_decrypt(ssn_enc, (SELECT k FROM keys)) FROM patients;`, why: 'Anyone who can read the database (or a backup) has both the lock and the key.', fix: `SELECT patient_id FROM patients;  -- keys live in a KMS / vault, passed by the app at runtime`, fixDialect: true },
      { wrong: `SELECT patient_id, substr(email, 1, 3) || '***' AS email_masked FROM patients;`, why: 'Short masks can leave too much (the whole local part for short names) and dropping the domain may break the business need. Decide the rule deliberately.', fix: `SELECT patient_id, substr(email, 1, 1) || '***' || substr(email, instr(email, '@')) AS email_masked FROM patients;` },
      { wrong: `-- Copy production to the test server "for realistic data"\n-- CREATE DATABASE billing_test AS COPY OF billing_prod;`, why: 'Test environments have weaker controls and more people with access. Real PHI there is a breach waiting to happen.', fix: `UPDATE patients SET email = 'patient' || patient_id || '@example.test', date_of_birth = substr(date_of_birth, 1, 4) || '-01-01';` },
    ],
    rules: ['Encrypt in transit (TLS, verified) and at rest, including backups.', 'Keys never live next to the data they protect.', 'Mask for display; encrypt for storage; hash passwords with a slow password hash.', 'Test and training databases get static-masked or synthetic data, never raw PHI.', 'Masking in a view is only a wall if the base table is closed.'],
    compare: `<table><tr><th>Technique</th><th>Reversible</th><th>Typical use</th></tr>
<tr><td>Encryption</td><td>Yes, with the key</td><td>SSN, member ID, whole database at rest</td></tr>
<tr><td>Hashing</td><td>No</td><td>Passwords, pseudonymous linkage keys</td></tr>
<tr><td>Tokenization</td><td>Yes, via a token vault</td><td>Card numbers, external identifiers</td></tr>
<tr><td>Dynamic masking</td><td>Data unchanged, view hides</td><td>Staff screens and reports</td></tr>
<tr><td>Static masking</td><td>No (copy is rewritten)</td><td>Test and training databases</td></tr></table>`,
    realWorld: 'Patient statements and call-center screens show masked identifiers; research extracts follow HIPAA Safe Harbor, which removes 18 identifiers including emails and all date elements except the year (and ages over 89 are grouped).',
    tips: ['Age or birth year often replaces the full date of birth in analytics.', 'Keep masking rules in one view or function, so every report masks the same way.', 'Verify TLS is actually used: in PostgreSQL, SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid().'],
    deep: `<p><b>HIPAA de-identification</b> has two paths: <i>Safe Harbor</i> (remove the 18 listed identifiers: names, geographic units smaller than a state, all date elements except year, phone, email, record numbers, etc.) or <i>Expert Determination</i> (a statistician certifies re-identification risk is very small). Masking an email is not enough by itself if name, ZIP and DOB remain: combined quasi-identifiers can re-identify people.</p>
<p><b>Deterministic pseudonyms</b>: to link one patient's records across extracts without revealing identity, use a keyed hash (HMAC-SHA256 with a secret) of the patient ID. A plain unsalted hash of a date of birth is trivially reversible by trying all dates.</p>`,
    tryIt: { prompt: 'Build a role-aware mask: the viewer_role CTE plays the logged-in user. Practitioners see the full date of birth, everyone else only the year. Change viewer_role to \'practitioner\' and compare.', starter: `WITH ctx AS (SELECT 'billing_clerk' AS viewer_role)
SELECT p.patient_id,
       p.first_name || ' ' || substr(p.last_name, 1, 1) || '.' AS patient,
       CASE WHEN ctx.viewer_role = 'practitioner' THEN p.date_of_birth
            ELSE substr(p.date_of_birth, 1, 4) || '-**-**' END AS dob,
       CASE WHEN ctx.viewer_role = 'practitioner' THEN p.email
            ELSE substr(p.email, 1, 1) || '***' || substr(p.email, instr(p.email, '@')) END AS email
FROM patients p, ctx
ORDER BY p.patient_id
LIMIT 8;` },
    challenge: {
      mode: 'state',
      level: 3,
      prompt: 'Create a view named patient_directory_masked for the billing office with exactly these columns in this order: patient_id, first_name, last_initial (first letter of last_name followed by a period, e.g. \'G.\'), birth_year (first 4 characters of date_of_birth), email_masked (first letter of the email, then \'***\', then everything from the @ on; NULL when email is NULL).',
      solution: `CREATE VIEW patient_directory_masked AS
SELECT patient_id,
       first_name,
       substr(last_name, 1, 1) || '.' AS last_initial,
       substr(date_of_birth, 1, 4) AS birth_year,
       substr(email, 1, 1) || '***' || substr(email, instr(email, '@')) AS email_masked
FROM patients;`,
      check: `-- (an empty placeholder is created only if your view does not exist)
CREATE VIEW IF NOT EXISTS patient_directory_masked AS SELECT NULL AS patient_id WHERE 0;
SELECT * FROM patient_directory_masked ORDER BY 1;`,
      hints: ['CREATE VIEW patient_directory_masked AS SELECT ... FROM patients;', 'Initial: substr(last_name, 1, 1) || \'.\'. Birth year: substr(date_of_birth, 1, 4).', 'For the email, instr(email, \'@\') gives the position of the @; substr(email, that_position) returns the domain part including @.', 'email_masked = substr(email, 1, 1) || \'***\' || substr(email, instr(email, \'@\')). NULL emails give NULL automatically.'],
    },
    quiz: [
      { q: 'Which technique is right for storing user passwords?', options: ['Reversible encryption', 'Masking', 'A slow salted password hash (bcrypt/argon2)', 'Base64'], answer: 2, why: 'Passwords never need to be decrypted, only verified.' },
      { q: 'A masked view hides date_of_birth, but billing_clerk still has SELECT on patients. Is DOB protected?', options: ['Yes', 'No, the clerk can read the base table', 'Only on weekdays', 'Only with TLS'], answer: 1, why: 'Masking views need the base table closed, like any security view.' },
      { q: 'What should a developer test database contain?', options: ['A nightly copy of production', 'Static-masked or synthetic data', 'Production data with TLS', 'Only the patients table'], answer: 1, why: 'Real PHI should not leave the protected production environment.' },
    ],
  },
  // ---------------------------------------------------------------- 09
  {
    id: 'security-09',
    goals: ['Why backups are a security control (ransomware, mistakes, HIPAA contingency plan)', 'Logical vs physical backups; full, incremental and log backups', 'Point-in-time recovery (PITR), RPO and RTO', 'SQLite: .backup, VACUUM INTO, snapshot tables', 'Restore testing: a backup you never restored is a hope, not a backup'],
    concept: `<p>A <b>backup</b> is a copy of the database you can go back to. It protects against disk failure, ransomware, bugs and the classic <code>DELETE</code> without a <code>WHERE</code>. HIPAA requires a data backup plan and a disaster recovery plan for PHI.</p>
<ul>
<li><b>Logical backup</b>: SQL statements or CSV that recreate the data (<code>pg_dump</code>, <code>mysqldump</code>, SQLite <code>.dump</code>). Portable, slower for huge databases.</li>
<li><b>Physical backup</b>: a copy of the data files (<code>pg_basebackup</code>, SQL Server <code>BACKUP DATABASE</code>, Oracle RMAN, SQLite <code>.backup</code> / <code>VACUUM INTO</code>). Fast, same engine version only.</li>
<li><b>Full / differential / incremental</b>: everything, changes since last full, changes since last backup.</li>
<li><b>Log (WAL) backups</b>: continuously archive the transaction log. Replaying it on top of a full backup gives <b>point-in-time recovery</b>: "restore to 10:41:59, one second before the bad DELETE".</li>
</ul>
<p>Two numbers drive the design: <b>RPO</b> (recovery point objective, how much data you can lose, e.g. 5 minutes) and <b>RTO</b> (recovery time objective, how long you can be down, e.g. 1 hour).</p>
<p>In SQLite:</p>
<pre>sqlite3 billing.db ".backup billing_2026-09-01.db"     -- online, consistent copy
VACUUM INTO '/backups/billing_2026-09-01.db';          -- compact copy via SQL
sqlite3 billing.db ".dump" > billing.sql              -- logical backup</pre>
<p>For a quick "undo" before a risky change, a <b>snapshot table</b> (<code>CREATE TABLE payments_backup AS SELECT * FROM payments</code>) lets you restore just the affected rows, as the example shows.</p>`,
    why: 'Ransomware attacks on hospitals and billing companies encrypt databases and demand payment. A recent, tested, offline backup is the difference between restoring in hours and paying criminals or losing records.',
    when: 'On a fixed schedule (nightly full + continuous log archiving), before every risky migration or bulk update, and before upgrades.',
    analogy: 'Paper charts are photocopied every night and the copies are stored in a different building. If the records room floods, you lose at most one day, and you know it works because every month someone actually rebuilds a chart from the copies.',
    syntax: `-- SQLite\nVACUUM INTO 'file.db';\n.backup file.db   (sqlite3 shell)\n-- snapshot table\nCREATE TABLE t_backup AS SELECT * FROM t;\n-- restore missing rows\nINSERT INTO t SELECT * FROM t_backup WHERE id NOT IN (SELECT id FROM t);`,
    sql: `-- 1. Snapshot before a risky change
CREATE TABLE payments_backup AS SELECT * FROM payments;

-- 2. The accident: a cleanup script deletes recent payments by mistake
DELETE FROM payments WHERE payment_date >= '2026-06-01';

-- 3. Restore only the rows that are missing
INSERT INTO payments
SELECT * FROM payments_backup b
WHERE b.payment_id NOT IN (SELECT payment_id FROM payments);

-- 4. Verify: counts and totals must match the snapshot
SELECT (SELECT COUNT(*) FROM payments)                 AS live_rows,
       (SELECT COUNT(*) FROM payments_backup)          AS backup_rows,
       (SELECT ROUND(SUM(amount), 2) FROM payments)    AS live_total,
       (SELECT ROUND(SUM(amount), 2) FROM payments_backup) AS backup_total;`,
    breakdown: [
      ['CREATE TABLE payments_backup AS SELECT * FROM payments', 'Logical snapshot of one table (no indexes or constraints are copied)'],
      ["DELETE ... WHERE payment_date >= '2026-06-01'", 'Simulated accident: 8 payments disappear'],
      ['INSERT INTO payments SELECT * FROM payments_backup ... NOT IN', 'Restore only missing rows, keeping their original payment_id'],
      ['SELECT counts and totals', 'Verification: a restore is only done when the numbers match'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 720 220" width="100%" role="img" aria-label="Backup timeline with full backups, continuous WAL archiving and point-in-time recovery before an accidental delete">
<g font-family="sans-serif" font-size="12">
<line x1="20" y1="110" x2="700" y2="110" stroke="var(--muted)" stroke-width="2"/>
<rect x="40" y="90" width="16" height="40" fill="var(--blue)"/><text x="48" y="150" fill="var(--text)" text-anchor="middle">Sun</text><text x="48" y="80" fill="var(--blue)" text-anchor="middle">FULL</text>
<rect x="360" y="90" width="16" height="40" fill="var(--blue)"/><text x="368" y="150" fill="var(--text)" text-anchor="middle">Sun</text><text x="368" y="80" fill="var(--blue)" text-anchor="middle">FULL</text>
<g fill="var(--green)"><rect x="80" y="104" width="6" height="12"/><rect x="120" y="104" width="6" height="12"/><rect x="160" y="104" width="6" height="12"/><rect x="200" y="104" width="6" height="12"/><rect x="240" y="104" width="6" height="12"/><rect x="280" y="104" width="6" height="12"/><rect x="320" y="104" width="6" height="12"/><rect x="400" y="104" width="6" height="12"/><rect x="440" y="104" width="6" height="12"/><rect x="480" y="104" width="6" height="12"/><rect x="520" y="104" width="6" height="12"/></g>
<text x="200" y="175" fill="var(--green)" text-anchor="middle">WAL / log archived every few minutes (RPO)</text>
<line x1="560" y1="60" x2="560" y2="160" stroke="var(--red)" stroke-width="2"/>
<text x="560" y="50" fill="var(--red)" text-anchor="middle">10:42 DELETE without WHERE</text>
<line x1="545" y1="70" x2="545" y2="150" stroke="var(--yellow)" stroke-width="2" stroke-dasharray="4 3"/>
<text x="470" y="200" fill="var(--yellow)" text-anchor="middle">PITR: restore full + replay logs to 10:41:59</text>
<path d="M376 190 Q460 215 545 155" stroke="var(--yellow)" fill="none" stroke-width="1.5"/>
<text x="640" y="150" fill="var(--muted)" text-anchor="middle">RTO = time to</text><text x="640" y="166" fill="var(--muted)" text-anchor="middle">restore and verify</text>
</g></svg>` },
    dialectSql: {
      postgres: `-- logical\npg_dump -Fc -d billing -f billing_2026-09-01.dump\npg_restore -d billing_restored billing_2026-09-01.dump\n-- physical + PITR\npg_basebackup -D /backups/base -X stream\n-- postgresql.conf: archive_mode = on, archive_command = '...'\n-- recovery: restore_command = '...', recovery_target_time = '2026-09-01 10:41:59'`,
      mysql: `mysqldump --single-transaction --routines billing > billing.sql\nmysql billing_restored < billing.sql\n-- PITR: replay binary logs\nmysqlbinlog --stop-datetime="2026-09-01 10:41:59" binlog.000042 | mysql billing`,
      sqlserver: `BACKUP DATABASE billing TO DISK = 'D:\\bk\\billing_full.bak' WITH COMPRESSION, CHECKSUM, ENCRYPTION (ALGORITHM = AES_256, SERVER CERTIFICATE = BackupCert);\nBACKUP LOG billing TO DISK = 'D:\\bk\\billing_log.trn';\nRESTORE DATABASE billing FROM DISK = 'D:\\bk\\billing_full.bak' WITH NORECOVERY;\nRESTORE LOG billing FROM DISK = 'D:\\bk\\billing_log.trn' WITH STOPAT = '2026-09-01 10:41:59', RECOVERY;`,
      oracle: `-- RMAN\nBACKUP DATABASE PLUS ARCHIVELOG;\nRUN {\n  SET UNTIL TIME "TO_DATE('2026-09-01 10:41:59','YYYY-MM-DD HH24:MI:SS')";\n  RESTORE DATABASE; RECOVER DATABASE;\n}\nALTER DATABASE OPEN RESETLOGS;\n-- single table: FLASHBACK TABLE payments TO TIMESTAMP ...`,
      sqlite: `-- shell\n.backup /backups/billing_2026-09-01.db\n.restore /backups/billing_2026-09-01.db\n.dump\n-- SQL\nVACUUM INTO '/backups/billing_2026-09-01.db';`,
    },
    internals: `<p>A physical backup must be <b>consistent</b>: copying a database file while it is being written can capture half a transaction. That is why you use the engine's tools. SQLite's backup API copies pages while holding a read lock (and restarts if another connection writes); <code>VACUUM INTO</code> writes a fresh, defragmented copy within one read transaction. PostgreSQL's base backup copies files while writing WAL, and the WAL replay makes the copy consistent.</p>
<p>PITR works because every change is first written to the write-ahead log. Base backup + all log segments up to time T = the database exactly as it was at T.</p>`,
    mistakes: [
      { wrong: `-- cp billing.db /backups/  (while the app is writing)`, why: 'A raw file copy during writes can capture a torn, corrupt state, and in WAL mode misses the -wal file.', fix: `VACUUM INTO '/tmp/billing_copy_demo.db';`, fixDialect: true },
      { wrong: `-- Backups stored on the same server, same credentials, never tested`, why: 'Ransomware encrypts the backups too; a disk failure takes both; and untested backups often fail to restore.', fix: `-- 3-2-1 rule: 3 copies, 2 media, 1 offsite/immutable; monthly restore test`, fixDialect: true },
      { wrong: `-- Unencrypted nightly dump uploaded to a shared bucket`, why: 'A backup contains all the PHI in the database. It needs the same (or stronger) protection: encryption, access control, retention.', fix: `-- pg_dump ... | gpg --encrypt -r backup-key > billing.dump.gpg  (or encrypted storage + KMS)`, fixDialect: true },
    ],
    rules: ['Use the engine\'s backup tools, not raw file copies of a live database.', 'Follow 3-2-1: three copies, two media, one offsite and immutable.', 'Encrypt backups: they are PHI.', 'Test restores regularly and measure RTO.', 'Snapshot tables before risky bulk changes.'],
    compare: `<table><tr><th></th><th>Logical (dump)</th><th>Physical (files/pages)</th></tr>
<tr><td>Portable across versions</td><td>Yes</td><td>No</td></tr>
<tr><td>Speed on large DBs</td><td>Slow</td><td>Fast</td></tr>
<tr><td>Point-in-time recovery</td><td>No</td><td>Yes (with log archiving)</td></tr>
<tr><td>Restore one table</td><td>Easy</td><td>Harder</td></tr>
<tr><td>SQLite example</td><td>.dump</td><td>.backup, VACUUM INTO</td></tr></table>`,
    realWorld: 'A billing company keeps nightly full backups for 35 days, archives WAL every minute (RPO about 1 minute), stores copies in immutable object storage in another region, and runs a quarterly disaster-recovery drill that restores into a clean environment and reconciles invoice totals.',
    tips: ['Automate a daily "restore and count rows" job; alert if it fails.', 'Keep backups at least as long as your records-retention policy requires, and delete them when it ends.', 'Document the restore runbook so anyone on call can follow it at 3 a.m.'],
    deep: `<p><b>Replication is not backup</b>: a replica copies the bad DELETE within milliseconds. Delayed replicas (PostgreSQL <code>recovery_min_apply_delay</code>, MySQL <code>SOURCE_DELAY</code>) give a window to stop replay before the mistake.</p>
<p><b>Verifying integrity</b>: SQLite <code>PRAGMA integrity_check</code>, SQL Server <code>RESTORE VERIFYONLY</code> + <code>DBCC CHECKDB</code>, PostgreSQL <code>pg_verifybackup</code> and data checksums. Then compare business totals (row counts, SUM of amounts) between source and restore, as in the challenge.</p>`,
    tryIt: { prompt: 'Make a real SQLite backup file with VACUUM INTO, attach it and compare it with the live database. If you run it a second time, change the file name (VACUUM INTO refuses to overwrite an existing file).', starter: `-- VACUUM INTO and ATTACH must run outside a transaction (no BEGIN ... COMMIT around them).
VACUUM INTO '/tmp/billing_backup_1.db';

ATTACH DATABASE '/tmp/billing_backup_1.db' AS bk;

SELECT 'invoices' AS table_name,
       (SELECT COUNT(*) FROM main.invoices) AS live_rows,
       (SELECT COUNT(*) FROM bk.invoices)   AS backup_rows
UNION ALL
SELECT 'payments',
       (SELECT COUNT(*) FROM main.payments),
       (SELECT COUNT(*) FROM bk.payments);` },
    challenge: {
      mode: 'state',
      level: 2,
      prompt: 'Practice a snapshot and restore. The starter contains an accidental DELETE. Before it, create a snapshot table named payments_backup with all rows of payments. After it, restore the deleted rows from payments_backup back into payments (with their original payment_id). Keep the DELETE line in your script.',
      starter: `-- 1) Take the snapshot here


-- 2) The accident (keep this line):
DELETE FROM payments WHERE payment_date >= '2026-06-01';

-- 3) Restore the missing rows here
`,
      solution: `CREATE TABLE payments_backup AS SELECT * FROM payments;

DELETE FROM payments WHERE payment_date >= '2026-06-01';

INSERT INTO payments
SELECT * FROM payments_backup b
WHERE b.payment_id NOT IN (SELECT payment_id FROM payments);`,
      check: `-- (an empty placeholder is created only if your backup table does not exist)
CREATE TABLE IF NOT EXISTS payments_backup AS SELECT * FROM payments WHERE 0;
SELECT (SELECT COUNT(*) FROM payments)              AS live_rows,
       (SELECT ROUND(SUM(amount), 2) FROM payments) AS live_total,
       (SELECT COUNT(*) FROM payments_backup)       AS backup_rows
ORDER BY 1;`,
      hints: ['A snapshot is CREATE TABLE ... AS SELECT * FROM ...', 'It must run BEFORE the DELETE, otherwise the deleted rows are not in it.', 'To restore, INSERT INTO payments SELECT * FROM payments_backup, but only rows whose payment_id is not already in payments.', 'INSERT INTO payments SELECT * FROM payments_backup b WHERE b.payment_id NOT IN (SELECT payment_id FROM payments);'],
    },
    quiz: [
      { q: 'What does point-in-time recovery need?', options: ['Only a nightly dump', 'A base backup plus archived transaction logs', 'A replica', 'A snapshot table'], answer: 1, why: 'Logs are replayed on top of the base backup up to the chosen moment.' },
      { q: 'Why is a replica not a backup?', options: ['Replicas are read-only', 'Mistakes and deletions replicate to it almost instantly', 'Replicas are unencrypted', 'Replicas cannot be queried'], answer: 1, why: 'A backup must preserve the past state; a replica mirrors the present.' },
      { q: 'RPO of 5 minutes means...', options: ['Restore takes 5 minutes', 'At most 5 minutes of data may be lost', 'Backups run for 5 minutes', 'Logs are kept 5 minutes'], answer: 1, why: 'RPO = acceptable data loss; RTO = acceptable downtime.' },
    ],
  },
  // ---------------------------------------------------------------- 10
  {
    id: 'security-10',
    goals: ['Export query results as CSV (SQLite .mode csv, group_concat, ||)', 'Bulk-load files: SQLite .import, PostgreSQL COPY, MySQL LOAD DATA, SQL Server BULK INSERT', 'The staging-table pattern: load raw text, validate, then insert', 'Quote CSV fields correctly', 'Handle exports of PHI safely'],
    concept: `<p>Data constantly moves in and out of a billing database: payment files from insurers, fee schedules, patient lists from the EHR, reports for finance, extracts for auditors.</p>
<p><b>Export</b> turns query results into a file, usually CSV:</p>
<pre>-- sqlite3 shell
.headers on
.mode csv
.output overdue.csv
SELECT invoice_id, invoice_date, status, total_amount FROM invoices WHERE status = 'Overdue';
.output stdout

-- PostgreSQL
COPY (SELECT invoice_id, invoice_date, status, total_amount
      FROM invoices WHERE status = 'Overdue')
TO STDOUT WITH (FORMAT csv, HEADER);</pre>
<p>Without a shell you can build CSV lines yourself with <code>||</code> and join them with <code>group_concat</code> (runnable below).</p>
<p><b>Import (bulk load)</b> reads a file into a table far faster than individual INSERTs:</p>
<pre>.import --csv --skip 1 remit_2026-09-02.csv staging_payments   -- sqlite3 shell
COPY staging_payments FROM STDIN WITH (FORMAT csv, HEADER);    -- PostgreSQL</pre>
<p>Never load an outside file straight into a production table. Load it into a <b>staging table</b> with loose (text) columns, <b>validate</b> it with SQL (does the invoice exist? is the amount a number? is the method allowed?), then <code>INSERT ... SELECT</code> only the good rows and report the rejected ones.</p>`,
    why: 'Remittance files, EHR feeds and fee schedules arrive as files every day. A bad row loaded blindly can post a payment to the wrong patient; an export saved to the wrong folder is a breach.',
    when: 'Batch interfaces (835 remittances turned into CSV, lockbox files), migrations, reporting extracts, and one-off data requests.',
    analogy: 'The mail room opens incoming checks on a sorting table (staging) and checks each one against the invoice list before it goes to the payment posting desk. Anything suspicious goes to the exceptions tray instead of the ledger.',
    syntax: `-- export (build CSV lines)\nSELECT col1 || ',' || col2 FROM t;\n-- import pattern\nCREATE TABLE staging (... TEXT ...);\n.import --csv --skip 1 file.csv staging\nINSERT INTO target (...) SELECT CAST(...) FROM staging WHERE <valid>;`,
    sql: `-- CSV export of overdue invoices: header line first, then one line per invoice
SELECT csv_line
FROM (
  SELECT 0 AS sort_key, 'invoice_id,invoice_date,status,total_amount' AS csv_line
  UNION ALL
  SELECT invoice_id,
         invoice_id || ',' || invoice_date || ',' || status || ',' || printf('%.2f', total_amount)
  FROM invoices
  WHERE status = 'Overdue'
)
ORDER BY sort_key;`,
    breakdown: [
      ["SELECT 0 AS sort_key, 'invoice_id,...' AS csv_line", 'The header row, with the smallest sort key so it comes first'],
      ["invoice_id || ',' || invoice_date || ...", 'Build one CSV line per row with the concatenation operator'],
      ["printf('%.2f', total_amount)", 'Format money with exactly two decimals (165.00, not 165.0)'],
      ['UNION ALL ... ORDER BY sort_key', 'Header first, then invoices in invoice_id order'],
    ],
    visual: { type: 'dml', statement: `CREATE TABLE staging_payments (invoice_id TEXT, payment_date TEXT, amount TEXT, method TEXT);
INSERT INTO staging_payments VALUES ('3','2026-09-02','45.00','EFT'), ('999','2026-09-02','10.00','EFT'), ('9','2026-09-02','abc','Check'), ('11','2026-09-02','9.75','Check');
INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)
SELECT i.invoice_id, i.payor_id, s.payment_date, CAST(s.amount AS REAL), s.method
FROM staging_payments s JOIN invoices i ON i.invoice_id = CAST(s.invoice_id AS INTEGER)
WHERE CAST(s.amount AS REAL) > 0`, view: `SELECT payment_id, invoice_id, payor_id, payment_date, amount, method FROM payments WHERE payment_id >= 44`, key: 'payment_id' },
    dialectSql: {
      postgres: `-- server-side file (needs pg_read_server_files / superuser):\nCOPY staging_payments FROM '/data/remit_2026-09-02.csv' WITH (FORMAT csv, HEADER);\n-- client-side file from psql (runs with your own privileges):\n\\copy staging_payments FROM 'remit_2026-09-02.csv' WITH (FORMAT csv, HEADER)\n-- export\nCOPY (SELECT * FROM invoices WHERE status = 'Overdue') TO STDOUT WITH (FORMAT csv, HEADER);`,
      mysql: `LOAD DATA LOCAL INFILE 'remit_2026-09-02.csv' INTO TABLE staging_payments\nFIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'\nIGNORE 1 LINES;\nSELECT * FROM invoices WHERE status = 'Overdue'\nINTO OUTFILE '/var/lib/mysql-files/overdue.csv' FIELDS TERMINATED BY ',' ENCLOSED BY '"';`,
      sqlserver: `BULK INSERT dbo.staging_payments\nFROM 'D:\\in\\remit_2026-09-02.csv'\nWITH (FORMAT = 'CSV', FIRSTROW = 2, TABLOCK);\n-- export from the command line:\n-- bcp "SELECT ... FROM billing.dbo.invoices" queryout overdue.csv -c -t, -T`,
      oracle: `-- SQL*Loader (sqlldr) with a control file, or an external table:\nCREATE TABLE staging_payments_ext (invoice_id VARCHAR2(20), payment_date VARCHAR2(10), amount VARCHAR2(20), method VARCHAR2(20))\nORGANIZATION EXTERNAL (TYPE ORACLE_LOADER DEFAULT DIRECTORY in_dir\n  ACCESS PARAMETERS (RECORDS DELIMITED BY NEWLINE SKIP 1 FIELDS TERMINATED BY ',')\n  LOCATION ('remit_2026-09-02.csv'));`,
      sqlite: `.import --csv --skip 1 remit_2026-09-02.csv staging_payments\n.headers on\n.mode csv\n.output overdue.csv\nSELECT * FROM invoices WHERE status = 'Overdue';\n.output stdout`,
    },
    internals: `<p>Bulk loaders are fast because they skip per-statement overhead: <code>COPY</code> streams rows through one command, writes pages in large batches, and (with options like <code>FREEZE</code> or SQL Server <code>TABLOCK</code>) reduces logging. For the biggest loads teams drop or disable indexes, load, then rebuild them once. SQLite's <code>.import</code> wraps the whole file in one transaction, which is the main reason it is fast.</p>
<p>CSV has no types: everything arrives as text. SQLite's flexible typing will happily store <code>'abc'</code> in a REAL column, which is exactly why staging + explicit validation matters.</p>`,
    mistakes: [
      { wrong: `SELECT patient_id || ',' || last_name || ',' || city FROM patients;`, why: 'A value containing a comma or quote breaks the columns, and NULL makes the whole line NULL (NULL || x is NULL).', fix: `SELECT patient_id || ',' || '"' || replace(last_name, '"', '""') || '"' || ',' || coalesce(city, '') FROM patients;` },
      { wrong: `-- .import remit.csv payments   (straight into the real table)`, why: 'Unknown invoice ids, text in amount columns and duplicate lines go straight into the ledger.', fix: `SELECT CAST(invoice_id AS INTEGER) FROM (SELECT '3' AS invoice_id) WHERE CAST(invoice_id AS INTEGER) IN (SELECT invoice_id FROM invoices);` },
      { wrong: `-- Export full patient table to a personal laptop "to analyze in Excel"`, why: 'Uncontrolled PHI copies are the most common source of healthcare breaches (lost laptops, emailed spreadsheets).', fix: `SELECT invoice_id, status, total_amount FROM invoices;  -- minimum necessary, to approved encrypted storage` },
    ],
    rules: ['Load into staging first; validate; then insert the good rows.', 'Keep and report rejected rows instead of silently dropping them.', 'Quote CSV text fields and double embedded quotes; handle NULLs explicitly.', 'Exports are PHI disclosures: minimum necessary columns, encrypted destination, logged.', 'Prefer client-side loading (\\copy, LOAD DATA LOCAL) with least privilege over server file access.'],
    compare: `<table><tr><th>Engine</th><th>Import</th><th>Export</th></tr>
<tr><td>SQLite</td><td>.import --csv</td><td>.mode csv + .output</td></tr>
<tr><td>PostgreSQL</td><td>COPY ... FROM / \\copy</td><td>COPY ... TO</td></tr>
<tr><td>MySQL</td><td>LOAD DATA [LOCAL] INFILE</td><td>SELECT ... INTO OUTFILE</td></tr>
<tr><td>SQL Server</td><td>BULK INSERT, bcp in</td><td>bcp queryout</td></tr>
<tr><td>Oracle</td><td>SQL*Loader, external tables</td><td>SQL*Plus spool, Data Pump</td></tr></table>`,
    realWorld: 'A daily job downloads 835 remittance files from the clearinghouse, converts them to CSV, loads them into staging, matches each line to an invoice, posts matched payments, and puts unmatched lines on a work queue for billing staff.',
    tips: ['Add a load_batch_id and source_file column to staging rows for traceability.', 'Check the file before loading: row count and control totals (sum of amounts) often come in a trailer record.', 'Use UTF-8 and ISO dates (YYYY-MM-DD) in every file you produce.'],
    deep: `<p><b>Security of server-side file access</b>: <code>COPY ... FROM '/path'</code> and <code>LOAD DATA INFILE</code> read files <i>on the database server</i> with the server's OS account. Combined with injection they can read configuration files or write web shells, which is why PostgreSQL restricts them to superusers or <code>pg_read_server_files</code>/<code>pg_write_server_files</code>, and MySQL limits them with <code>secure_file_priv</code>. <code>COPY ... TO PROGRAM</code> runs shell commands and should be treated like root access.</p>
<p><b>Idempotent loads</b>: re-running the same file must not double-post payments. Keep a unique key on (source_file, line_number) or on the payer's trace number and use <code>INSERT ... ON CONFLICT DO NOTHING</code>.</p>`,
    tryIt: { prompt: 'Build a whole CSV document in one value with group_concat and a newline separator (char(10)). Emails are quoted because they could contain commas. Try adding a header line.', starter: `SELECT group_concat(
         patient_id || ',' ||
         '"' || replace(first_name || ' ' || last_name, '"', '""') || '"' || ',' ||
         coalesce('"' || email || '"', ''),
         char(10)) AS csv_document
FROM (SELECT patient_id, first_name, last_name, email
      FROM patients
      WHERE patient_id <= 8
      ORDER BY patient_id);` },
    challenge: {
      mode: 'state',
      level: 3,
      prompt: 'A remittance file was loaded into staging_payments (see starter). Insert only the valid rows into payments: the invoice must exist, the amount must be a positive number, and the method must be one of EFT, Check, Credit Card, Cash. Use the invoice\'s own payor_id as payor_id, keep payment_date from the file and store amount as REAL. Keep the staging statements in your script.',
      starter: `CREATE TABLE staging_payments (invoice_id TEXT, payment_date TEXT, amount TEXT, method TEXT);
INSERT INTO staging_payments VALUES
  ('3',   '2026-09-02', '45.00', 'EFT'),
  ('9',   '2026-09-02', '97.50', 'EFT'),
  ('999', '2026-09-02', '10.00', 'EFT'),     -- unknown invoice
  ('11',  '2026-09-02', 'abc',   'Check'),   -- not a number
  ('14',  '2026-09-02', '20.00', 'Wire'),    -- method not allowed
  ('26',  '2026-09-02', '65.00', 'Check');

-- Now load only the valid rows into payments:
`,
      solution: `CREATE TABLE staging_payments (invoice_id TEXT, payment_date TEXT, amount TEXT, method TEXT);
INSERT INTO staging_payments VALUES
  ('3',   '2026-09-02', '45.00', 'EFT'),
  ('9',   '2026-09-02', '97.50', 'EFT'),
  ('999', '2026-09-02', '10.00', 'EFT'),
  ('11',  '2026-09-02', 'abc',   'Check'),
  ('14',  '2026-09-02', '20.00', 'Wire'),
  ('26',  '2026-09-02', '65.00', 'Check');

INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method)
SELECT i.invoice_id, i.payor_id, s.payment_date, CAST(s.amount AS REAL), s.method
FROM staging_payments s
JOIN invoices i ON i.invoice_id = CAST(s.invoice_id AS INTEGER)
WHERE CAST(s.amount AS REAL) > 0
  AND s.method IN ('EFT', 'Check', 'Credit Card', 'Cash');`,
      check: `SELECT invoice_id, payor_id, payment_date, amount, method
FROM payments
WHERE payment_date = '2026-09-02'
ORDER BY invoice_id;`,
      hints: ['Use INSERT INTO payments (invoice_id, payor_id, payment_date, amount, method) SELECT ... FROM staging_payments s.', 'JOIN invoices i ON i.invoice_id = CAST(s.invoice_id AS INTEGER): unknown invoices drop out and you get i.payor_id.', 'CAST(\'abc\' AS REAL) is 0, so CAST(s.amount AS REAL) > 0 rejects non-numbers.', 'Add AND s.method IN (\'EFT\', \'Check\', \'Credit Card\', \'Cash\'). Three rows should be loaded (invoices 3, 9, 26).'],
    },
    quiz: [
      { q: 'Why load a file into a staging table first?', options: ['Staging tables are faster to query', 'To validate and reject bad rows before they reach production tables', 'CSV cannot be loaded into real tables', 'To encrypt the file'], answer: 1, why: 'Staging separates "received" from "accepted".' },
      { q: 'What is the result of 5 || \',\' || NULL in SQLite?', options: ['5,', '5,NULL', 'NULL', 'An error'], answer: 2, why: 'Concatenating NULL gives NULL; use coalesce for CSV output.' },
      { q: 'Which PostgreSQL command reads a file from the client machine with your own privileges?', options: ['COPY ... FROM \'/path\'', '\\copy ... FROM \'file\' (psql)', 'LOAD DATA', 'BULK INSERT'], answer: 1, why: 'Server-side COPY reads the server\'s file system and needs special privileges.' },
    ],
  },
  // ---------------------------------------------------------------- 11
  {
    id: 'security-11',
    goals: ['What to audit in a PHI database: who, what, when, from where', 'Build an audit log table filled by a trigger', 'Pass the application user into the database (session context)', 'Monitor activity: active sessions, slow queries, failed logins, unusual access', 'Native audit tools: pgAudit, SQL Server Audit, Oracle Unified Auditing, MySQL audit plugins'],
    concept: `<p>HIPAA requires <b>audit controls</b>: you must be able to answer "who looked at or changed this patient's record, and when?" Auditing has two parts:</p>
<ul>
<li><b>Change auditing</b>: every INSERT, UPDATE, DELETE on sensitive tables is recorded with old value, new value, user and time. Triggers can do this inside the database (runnable below).</li>
<li><b>Access auditing</b>: every <i>read</i> of PHI is recorded too. Triggers cannot see SELECTs, so this comes from the database's audit feature (pgAudit, SQL Server Audit) or from the application's own access log.</li>
</ul>
<p>Good audit records have: <b>who</b> (the real person, not just the shared app login), <b>what</b> (table, row, columns, old/new values), <b>when</b> (UTC timestamp), <b>where</b> (client IP, application), and <b>why</b> if possible (the screen or ticket).</p>
<p>An audit log must be <b>append-only</b>: normal users can insert into it only through the trigger and nobody can UPDATE or DELETE it (store a copy outside the database too).</p>
<p><b>Monitoring</b> watches the database in real time: active sessions and long-running queries (<code>pg_stat_activity</code>), slow-query logs, failed login attempts, sudden spikes (one user reading 5,000 patient records at 2 a.m.). Alerts turn audit data into protection.</p>`,
    why: 'Breaches are often discovered through audit trails, and HIPAA investigations ask for them. Staff snooping on a celebrity or neighbour\'s record is caught only if reads are logged and reviewed.',
    when: 'For every table holding PHI or money (patients, invoices, payments, transactions), for privileged accounts, and for all schema and permission changes.',
    analogy: 'The sign-out sheet and security camera in the medical records room. The sheet records who took which chart and when; the camera catches the person who did not sign. Someone reviews both.',
    syntax: `CREATE TABLE audit_log (..., old_value, new_value, changed_by, changed_at);\nCREATE TRIGGER trg AFTER UPDATE OF col ON t\nFOR EACH ROW WHEN OLD.col IS NOT NEW.col\nBEGIN\n  INSERT INTO audit_log (...) VALUES (..., OLD.col, NEW.col, ...);\nEND;`,
    sql: `-- The app writes the logged-in person here when it opens a connection / transaction
CREATE TABLE session_context (username TEXT NOT NULL);
INSERT INTO session_context VALUES ('billing.amy');

CREATE TABLE phi_audit_log (
  audit_id    INTEGER PRIMARY KEY,
  table_name  TEXT NOT NULL,
  row_id      INTEGER NOT NULL,
  column_name TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  changed_by  TEXT,
  changed_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER trg_patients_email_audit
AFTER UPDATE OF email ON patients
FOR EACH ROW
WHEN OLD.email IS NOT NEW.email
BEGIN
  INSERT INTO phi_audit_log (table_name, row_id, column_name, old_value, new_value, changed_by)
  VALUES ('patients', NEW.patient_id, 'email', OLD.email, NEW.email,
          (SELECT username FROM session_context LIMIT 1));
END;

UPDATE patients SET email = 'mia.walker@mail.com' WHERE patient_id = 12;
UPDATE patients SET email = 'john.smith@newmail.com' WHERE patient_id = 2;
UPDATE patients SET email = email WHERE patient_id = 3;   -- no real change: not logged

SELECT audit_id, table_name, row_id, column_name, old_value, new_value, changed_by
FROM phi_audit_log
ORDER BY audit_id;`,
    breakdown: [
      ['session_context', 'Emulates "current user": SQLite has no users, so the app records who is acting'],
      ['phi_audit_log', 'Append-only history: which row and column, old and new value, who, when'],
      ['AFTER UPDATE OF email ON patients', 'Fires only when the email column is in the UPDATE'],
      ['WHEN OLD.email IS NOT NEW.email', 'Skip no-op updates; IS NOT also handles NULL correctly'],
      ['(SELECT username FROM session_context LIMIT 1)', 'Records the real person, not a shared app account'],
      ['SELECT ... FROM phi_audit_log', 'Two rows logged; the no-op update on patient 3 is not'],
    ],
    visual: { type: 'flow', steps: [
      ['App sets session_context = billing.amy', 'who is acting'],
      ['UPDATE patients SET email = ... WHERE patient_id = 12', 'normal statement from the app'],
      ['Trigger trg_patients_email_audit fires', 'same transaction as the UPDATE'],
      ['INSERT INTO phi_audit_log (old, new, who, when)', 'committed together, or rolled back together'],
      ['Auditor queries phi_audit_log / alerts fire', 'reviewed daily; copies shipped to a SIEM'],
    ] },
    dialectSql: {
      postgres: `-- pgAudit: statement-level audit of reads and writes\n-- postgresql.conf: shared_preload_libraries = 'pgaudit'\nALTER SYSTEM SET pgaudit.log = 'read, write, role, ddl';\nALTER ROLE billing_clerk SET pgaudit.log = 'read, write';\n-- live monitoring\nSELECT pid, usename, client_addr, state, now() - query_start AS running_for, query\nFROM pg_stat_activity WHERE state <> 'idle' ORDER BY running_for DESC;`,
      sqlserver: `CREATE SERVER AUDIT phi_audit TO FILE (FILEPATH = 'D:\\audit\\');\nALTER SERVER AUDIT phi_audit WITH (STATE = ON);\nCREATE DATABASE AUDIT SPECIFICATION phi_reads FOR SERVER AUDIT phi_audit\n  ADD (SELECT, UPDATE ON dbo.patients BY public) WITH (STATE = ON);\nSELECT event_time, server_principal_name, statement\nFROM sys.fn_get_audit_file('D:\\audit\\*.sqlaudit', DEFAULT, DEFAULT);`,
      oracle: `CREATE AUDIT POLICY phi_access ACTIONS SELECT ON billing.patients, UPDATE ON billing.patients;\nAUDIT POLICY phi_access;\nSELECT event_timestamp, dbusername, action_name, sql_text\nFROM unified_audit_trail WHERE object_name = 'PATIENTS' ORDER BY event_timestamp DESC;`,
      mysql: `-- MySQL Enterprise Audit / Percona or MariaDB audit plugin\nINSTALL PLUGIN server_audit SONAME 'server_audit.so';\nSET GLOBAL server_audit_events = 'CONNECT,QUERY_DML,QUERY_DDL';\nSET GLOBAL server_audit_logging = ON;\n-- live: SHOW PROCESSLIST; performance_schema.events_statements_summary_by_digest`,
      sqlite: `-- Triggers for change auditing (as in the example).\n-- Reads cannot be audited by SQLite itself: log them in the application,\n-- or use sqlite3_trace_v2() to capture executed statements.`,
    },
    internals: `<p>A trigger runs <b>inside the same transaction</b> as the statement that fired it. If the UPDATE rolls back, its audit row disappears too, so the log never claims a change that did not happen. The cost is extra writes on every change: keep audit triggers small (no heavy queries) and index the audit table by (table_name, row_id) and time for investigations.</p>
<p>Native audit systems (pgAudit, SQL Server Audit) hook into the executor and write to the server log or a separate file, which captures SELECTs as well and cannot be switched off by a table owner. For tamper resistance, logs are shipped to a separate system (SIEM) that database admins cannot edit.</p>`,
    mistakes: [
      { wrong: `-- Audit rows record only the shared app login\nINSERT INTO phi_audit_log (..., changed_by) VALUES (..., 'billing_app');`, why: 'Every change shows the same account; you cannot tell which employee did it.', fix: `SELECT username FROM (SELECT 'billing.amy' AS username);  -- pass the real user into the session context` },
      { wrong: `-- Everyone who can write patients can also DELETE FROM phi_audit_log`, why: 'An insider covers their tracks. The log must be append-only and ideally copied off the server.', fix: `SELECT 'REVOKE UPDATE, DELETE ON phi_audit_log FROM PUBLIC' AS policy;` },
      { wrong: `CREATE TRIGGER t AFTER UPDATE ON patients BEGIN INSERT INTO phi_audit_log (table_name, row_id, column_name, old_value, new_value) VALUES ('patients', NEW.patient_id, 'email', OLD.email, NEW.email); END;`, why: 'No UPDATE OF column and no WHEN: every update of any column logs an "email change", filling the log with noise that hides real events.', fix: `SELECT 'AFTER UPDATE OF email ... WHEN OLD.email IS NOT NEW.email' AS better_trigger;` },
    ],
    rules: ['Log who, what, when, where; the "who" must be a real person.', 'Audit reads of PHI, not only changes.', 'Audit logs are append-only and copied off the database server.', 'Monitoring needs alerts and someone who reviews them.', 'Audit permission and schema changes too (GRANT, ALTER, DROP).'],
    compare: `<table><tr><th>Method</th><th>Captures reads</th><th>Old/new values</th><th>Tamper resistance</th></tr>
<tr><td>Triggers + audit table</td><td>No</td><td>Yes</td><td>Medium (same DB)</td></tr>
<tr><td>Native audit (pgAudit, SQL Server Audit)</td><td>Yes</td><td>Statement only</td><td>High (separate log)</td></tr>
<tr><td>Temporal / history tables</td><td>No</td><td>Full row versions</td><td>Medium</td></tr>
<tr><td>Application access log</td><td>Yes (per screen)</td><td>Depends</td><td>Depends</td></tr></table>`,
    realWorld: 'Hospitals run "privacy monitoring" that flags staff who open records of patients with the same last name, VIPs, or coworkers. A billing clerk exporting thousands of patient emails in one evening triggers an alert to the privacy officer.',
    tips: ['Store timestamps in UTC.', 'Put a retention policy on audit data (HIPAA documentation is kept 6 years) and archive older partitions.', 'Review the audit trail regularly; logs no one reads do not protect anyone.'],
    deep: `<p><b>Generic audit triggers</b>: in PostgreSQL one trigger function can serve every table, storing <code>to_jsonb(OLD)</code> and <code>to_jsonb(NEW)</code> and <code>current_setting('app.user')</code>. Tools like pgMemento or the <code>audit-trigger</code> project do this. In SQL Server, <b>temporal tables</b> keep every row version automatically, and <b>Change Data Capture</b> streams changes from the log without triggers.</p>
<p><b>Anomaly detection query</b> on an access log: count distinct patients per user per hour and compare with that user's 30-day average; alert above 5x. The same window-function skills from earlier sections apply to security data.</p>`,
    tryIt: { prompt: 'Monitoring query on existing data: transactions record who posted each ledger line. Find each user\'s activity per transaction type. Which user posted refunds or write-offs? (In a real review, those need a second approver.)', starter: `SELECT posted_by,
       transaction_type,
       COUNT(*) AS lines,
       ROUND(SUM(amount), 2) AS total,
       MIN(transaction_date) AS first_seen,
       MAX(transaction_date) AS last_seen
FROM transactions
GROUP BY posted_by, transaction_type
ORDER BY posted_by, transaction_type;` },
    challenge: {
      mode: 'state',
      level: 3,
      prompt: 'Create an audit trail for invoice status changes. 1) Create table invoice_status_audit (audit_id INTEGER PRIMARY KEY, invoice_id INTEGER, old_status TEXT, new_status TEXT, changed_at TEXT DEFAULT (datetime(\'now\'))). 2) Create a trigger that, after an UPDATE of status on invoices, inserts one row per changed invoice, only when the status really changed. 3) Run: UPDATE invoices SET status = \'Paid\' WHERE invoice_id IN (9, 11, 14);  (invoice 14 is already Paid and must not be logged).',
      solution: `CREATE TABLE invoice_status_audit (
  audit_id   INTEGER PRIMARY KEY,
  invoice_id INTEGER,
  old_status TEXT,
  new_status TEXT,
  changed_at TEXT DEFAULT (datetime('now'))
);

CREATE TRIGGER trg_invoice_status_audit
AFTER UPDATE OF status ON invoices
FOR EACH ROW
WHEN OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO invoice_status_audit (invoice_id, old_status, new_status)
  VALUES (NEW.invoice_id, OLD.status, NEW.status);
END;

UPDATE invoices SET status = 'Paid' WHERE invoice_id IN (9, 11, 14);`,
      check: `-- (an empty placeholder is created only if your audit table does not exist)
CREATE TABLE IF NOT EXISTS invoice_status_audit (audit_id INTEGER PRIMARY KEY, invoice_id INTEGER, old_status TEXT, new_status TEXT);
SELECT invoice_id, old_status, new_status
FROM invoice_status_audit
ORDER BY invoice_id;`,
      hints: ['Create the table exactly as described, then the trigger, then run the UPDATE last (the trigger must exist before the change).', 'Trigger header: CREATE TRIGGER trg_invoice_status_audit AFTER UPDATE OF status ON invoices FOR EACH ROW', 'Add WHEN OLD.status IS NOT NEW.status so invoice 14 (Paid to Paid) is skipped.', 'Body: BEGIN INSERT INTO invoice_status_audit (invoice_id, old_status, new_status) VALUES (NEW.invoice_id, OLD.status, NEW.status); END;'],
    },
    quiz: [
      { q: 'Why can a trigger-based audit log not show who READ a patient record?', options: ['Triggers are too slow', 'Triggers fire on INSERT/UPDATE/DELETE, not on SELECT', 'SELECT is not logged by law', 'Triggers only work in PostgreSQL'], answer: 1, why: 'Read auditing needs native audit features or application logging.' },
      { q: 'The UPDATE that fired an audit trigger is rolled back. What happens to the audit row?', options: ['It stays', 'It is rolled back too', 'It is marked as failed', 'It is duplicated'], answer: 1, why: 'Triggers run in the same transaction as the statement.' },
      { q: 'What makes changed_by useful in an audit record?', options: ['It stores the shared app login', 'It identifies the actual person who made the change', 'It is required by SQLite', 'It speeds up queries'], answer: 1, why: 'HIPAA requires unique user identification; a shared login cannot answer "who?".' },
    ],
  },
  // ---------------------------------------------------------------- 12
  {
    id: 'security-12',
    goals: ['How an application talks to a database: driver, connection string, connection, cursor', 'Connection pools: why they exist and how to size them', 'ORMs: what they generate, eager vs lazy loading, the N+1 problem', 'Transactions, timeouts and error handling in application code', 'Secrets and least privilege for application accounts'],
    concept: `<p>Most SQL in production is sent by <b>application code</b>, not typed by people. The pieces:</p>
<ul>
<li><b>Driver</b>: the library that speaks the database's network protocol: psycopg (Python/PostgreSQL), node-postgres, JDBC drivers (Java), Microsoft.Data.SqlClient (C#), sqlite3 (built into Python).</li>
<li><b>Connection string</b>: where and how to connect: <code>postgresql://billing_app@db.internal:5432/billing?sslmode=verify-full</code>. The password comes from a secrets manager or environment, never from source code.</li>
<li><b>Connection</b>: an authenticated session. Opening one costs a network round trip, TLS handshake and authentication (often 5-50 ms, and a new server process in PostgreSQL).</li>
<li><b>Connection pool</b>: keeps a few connections open and lends them to requests. 1,000 web requests per second can share 20 connections.</li>
<li><b>ORM</b> (object-relational mapper: SQLAlchemy, Django ORM, Hibernate/JPA, Entity Framework, Prisma, Sequelize): maps tables to classes and generates SQL for you.</li>
</ul>
<p>A typical request in Python:</p>
<pre>with pool.connection() as conn:                  # borrow from the pool
    with conn.transaction():                     # BEGIN ... COMMIT / ROLLBACK
        rows = conn.execute(
            "SELECT i.invoice_id, i.invoice_date, i.status, i.total_amount, p.payor_name "
            "FROM invoices i LEFT JOIN payors p ON p.payor_id = i.payor_id "
            "WHERE i.patient_id = %s ORDER BY i.invoice_date DESC LIMIT 20",
            (patient_id,)).fetchall()            # parameter, not concatenation
# connection goes back to the pool here, even if an exception happened</pre>
<p>The same with an ORM (SQLAlchemy): <code>session.scalars(select(Invoice).options(joinedload(Invoice.payor)).where(Invoice.patient_id == pid).order_by(Invoice.invoice_date.desc()).limit(20))</code>. It generates essentially the SQL in the example below, with parameters.</p>
<p><b>The N+1 trap</b>: loading 20 invoices, then lazily touching <code>invoice.payor.payor_name</code> in a loop, sends 1 + 20 queries. Ask the ORM to <b>eager load</b> (a JOIN or one extra IN query) instead.</p>`,
    why: 'Security, performance and correctness problems in real systems usually live at this boundary: leaked credentials, injected strings, exhausted pools, N+1 query storms, and transactions left open.',
    when: 'Whenever you write or review backend code that touches the database: web APIs, background jobs, ETL scripts, reporting services.',
    analogy: 'A pool is the hospital\'s fleet of wheelchairs at the entrance. Patients borrow one, use it for the visit, and return it. Nobody buys a new wheelchair per visit, and if all are taken, the next person waits a moment instead of the lobby filling with new chairs.',
    syntax: `-- What an ORM eager load typically sends\nSELECT parent.cols, child.cols\nFROM parent\nLEFT JOIN child ON child.id = parent.child_id\nWHERE parent.filter_col = ?     -- bound parameter\nORDER BY ... LIMIT ?;`,
    sql: `-- What the patient-portal endpoint sends for patient 7 (parameters shown as values)
SELECT i.invoice_id,
       i.invoice_date,
       i.status,
       i.total_amount,
       p.payor_name
FROM invoices i
LEFT JOIN payors p ON p.payor_id = i.payor_id
WHERE i.patient_id = 7          -- $1 in the real call
ORDER BY i.invoice_date DESC
LIMIT 20;                       -- $2 in the real call`,
    breakdown: [
      ['SELECT i.invoice_id, ..., p.payor_name', 'Only the columns the page shows (no SELECT * from the ORM)'],
      ['LEFT JOIN payors p', 'Eager load: payor names come in the same query, avoiding N+1'],
      ['LEFT (not INNER)', 'Self-pay invoices with no payor still appear'],
      ['WHERE i.patient_id = 7', 'Bound parameter from the logged-in patient\'s session, never from the URL alone'],
      ['ORDER BY ... LIMIT 20', 'Paginate: never load a patient\'s entire history into memory'],
    ],
    visual: { type: 'html', html: `<svg viewBox="0 0 720 250" width="100%" role="img" aria-label="Requests go through the application and ORM, borrow a pooled connection, send a parameterized query to the database">
<defs><marker id="sec12arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker></defs>
<g font-family="sans-serif" font-size="12">
<rect x="10" y="30" width="100" height="30" rx="6" fill="var(--panel2)" stroke="var(--blue)"/><text x="60" y="50" fill="var(--text)" text-anchor="middle">request 1</text>
<rect x="10" y="75" width="100" height="30" rx="6" fill="var(--panel2)" stroke="var(--blue)"/><text x="60" y="95" fill="var(--text)" text-anchor="middle">request 2</text>
<rect x="10" y="120" width="100" height="30" rx="6" fill="var(--panel2)" stroke="var(--blue)"/><text x="60" y="140" fill="var(--text)" text-anchor="middle">request ...</text>
<rect x="10" y="165" width="100" height="30" rx="6" fill="var(--panel2)" stroke="var(--blue)"/><text x="60" y="185" fill="var(--text)" text-anchor="middle">request 500</text>
<rect x="150" y="60" width="150" height="110" rx="8" fill="var(--panel2)" stroke="var(--accent)" stroke-width="2"/>
<text x="225" y="85" fill="var(--text)" text-anchor="middle">App + ORM</text>
<text x="225" y="105" fill="var(--muted)" text-anchor="middle" font-size="11">auth, validation</text>
<text x="225" y="122" fill="var(--muted)" text-anchor="middle" font-size="11">builds SQL with $1</text>
<text x="225" y="139" fill="var(--muted)" text-anchor="middle" font-size="11">eager loading</text>
<rect x="340" y="45" width="150" height="140" rx="8" fill="var(--panel2)" stroke="var(--green)"/>
<text x="415" y="68" fill="var(--green)" text-anchor="middle">Connection pool</text>
<g fill="var(--green)"><rect x="360" y="82" width="110" height="14" rx="3"/><rect x="360" y="102" width="110" height="14" rx="3"/><rect x="360" y="122" width="110" height="14" rx="3"/></g>
<rect x="360" y="142" width="110" height="14" rx="3" fill="none" stroke="var(--green)"/>
<text x="415" y="176" fill="var(--muted)" text-anchor="middle" font-size="11">20 connections, reused</text>
<rect x="540" y="60" width="170" height="110" rx="8" fill="var(--panel2)" stroke="var(--purple)"/>
<text x="625" y="85" fill="var(--text)" text-anchor="middle">Database</text>
<text x="625" y="105" fill="var(--muted)" text-anchor="middle" font-size="11">login: billing_app</text>
<text x="625" y="122" fill="var(--muted)" text-anchor="middle" font-size="11">least privilege, TLS</text>
<text x="625" y="139" fill="var(--muted)" text-anchor="middle" font-size="11">cached plan for $1 query</text>
<g stroke="var(--muted)" stroke-width="1.5" fill="none" marker-end="url(#sec12arrow)">
<path d="M110 45 L148 90"/><path d="M110 90 L148 105"/><path d="M110 135 L148 125"/><path d="M110 180 L148 145"/>
<path d="M300 115 L338 115"/><path d="M490 115 L538 115"/>
</g>
<text x="360" y="225" fill="var(--muted)" text-anchor="middle">Borrow, run in a short transaction, return. Never hold a connection while waiting on the user.</text>
</g></svg>` },
    internals: `<p>A pooled connection keeps its <b>session state</b>: temp tables, <code>SET</code> variables, open transactions, prepared statements. Good pools reset the session when a connection is returned (<code>DISCARD ALL</code> in PostgreSQL, <code>sp_reset_connection</code> in SQL Server). External poolers like PgBouncer in <i>transaction mode</i> hand a different server connection to each transaction, so session-level settings and <code>SET</code> without <code>LOCAL</code> are unreliable there, which matters for RLS context.</p>
<p>Pool sizing: the database can only run about (CPU cores x 2 + disks) queries truly in parallel. A pool of 10-30 per app server usually beats 200: extra connections just queue inside the database and consume memory (PostgreSQL uses one OS process per connection).</p>`,
    mistakes: [
      { wrong: `for inv in session.query(Invoice).filter_by(patient_id=7):\n    print(inv.payor.payor_name)   # lazy load: one query per invoice`, why: 'N+1 queries: 1 for invoices, then 1 per invoice for its payor. Fine in a test with 3 rows, a meltdown with 10,000.', fix: `SELECT i.invoice_id, p.payor_name FROM invoices i LEFT JOIN payors p ON p.payor_id = i.payor_id WHERE i.patient_id = 7;` },
      { wrong: `DATABASE_URL = "postgresql://postgres:Winter2026!@db/billing"   # in source code`, why: 'Credentials in the repository leak through every clone, fork and CI log, and it is a superuser.', fix: `-- DATABASE_URL read from a secrets manager at runtime, user billing_app with minimum grants`, fixDialect: true },
      { wrong: `conn = pool.getconn()\nrows = conn.execute(sql, params)   # exception here: connection never returned`, why: 'A leaked connection (or a transaction left open) slowly exhausts the pool until every request hangs. Open transactions also block VACUUM and hold locks.', fix: `-- with pool.connection() as conn: ...   (always returned, transaction always ended)`, fixDialect: true },
    ],
    rules: ['Always bind parameters, including through ORM raw-SQL helpers.', 'Borrow a connection late, return it early; use with/using/try-finally.', 'Keep transactions short and never wait on user input inside one.', 'Watch for N+1: eager-load related data or write the JOIN.', 'Credentials come from a secrets store; the app login has only the grants it needs.', 'Set statement timeouts so one bad query cannot hold the pool.'],
    compare: `<table><tr><th></th><th>Raw driver SQL</th><th>Query builder</th><th>Full ORM</th></tr>
<tr><td>Examples</td><td>psycopg, JDBC, ADO.NET</td><td>SQLAlchemy Core, Knex, jOOQ</td><td>Django ORM, Hibernate, EF Core</td></tr>
<tr><td>Control over SQL</td><td>Full</td><td>High</td><td>Lower (generated)</td></tr>
<tr><td>Injection safety</td><td>If you bind</td><td>By default</td><td>By default (except raw helpers)</td></tr>
<tr><td>Risk</td><td>Boilerplate</td><td>Learning curve</td><td>N+1, over-fetching, hidden queries</td></tr></table>`,
    realWorld: 'A patient portal runs 6 app servers, each with a pool of 15 connections, behind PgBouncer, all logging in as portal_app which can only SELECT from portal views and INSERT into payments through one function. Slow-query logs and ORM query counters per request catch N+1 regressions in code review.',
    tips: ['Turn on SQL logging in development to see what your ORM really sends.', 'Name connections (application_name in PostgreSQL) so pg_stat_activity shows which service runs which query.', 'Use read replicas through a separate read-only pool for reports.', 'Retry only on safe errors (serialization failure, deadlock) and only for idempotent work.'],
    deep: `<p><b>Parameter-count limits and batching</b>: drivers offer batch APIs (<code>executemany</code>, JDBC <code>addBatch</code>, <code>COPY</code> via psycopg) that send many parameter sets for one statement, far faster than looping.</p>
<p><b>Java and C# essentials</b>:</p>
<pre>// Java: HikariCP pool + try-with-resources
try (Connection c = dataSource.getConnection();
     PreparedStatement ps = c.prepareStatement(
         "SELECT invoice_id, total_amount FROM invoices WHERE patient_id = ? ORDER BY invoice_date DESC")) {
    ps.setInt(1, patientId);
    ps.setQueryTimeout(5);
    try (ResultSet rs = ps.executeQuery()) { while (rs.next()) { /* map row */ } }
}

// C#: pooling is on by default in the connection string
await using var conn = new SqlConnection(cs);   // "...;Max Pool Size=30;Encrypt=True"
await conn.OpenAsync();
await using var cmd = new SqlCommand("SELECT invoice_id FROM dbo.invoices WHERE patient_id = @pid", conn);
cmd.Parameters.Add("@pid", SqlDbType.Int).Value = patientId;</pre>
<p><b>Authorization is the app's job too</b>: the query must use the patient id from the authenticated session. Accepting <code>/api/patients/7/invoices</code> and trusting the 7 is an IDOR (insecure direct object reference): the SQL is parameterized and still leaks another patient's data.</p>`,
    tryIt: { prompt: 'See the N+1 pattern in SQL: the first query is what a lazy ORM sends first, then it sends one payor query per row. Compare with the single JOIN below it, which returns everything at once.', starter: `-- Lazy loading: query 1 ...
SELECT invoice_id, payor_id FROM invoices WHERE patient_id = 7;
-- ... then N more, one per invoice, e.g.:
SELECT payor_name FROM payors WHERE payor_id = 2;

-- Eager loading: one query
SELECT i.invoice_id, i.invoice_date, p.payor_name
FROM invoices i
LEFT JOIN payors p ON p.payor_id = i.payor_id
WHERE i.patient_id = 7
ORDER BY i.invoice_date DESC;` },
    challenge: {
      level: 3,
      prompt: 'Write the single query a patient-portal "My bills" page should send for patient 3 (instead of 1 + N ORM queries): invoice_id, invoice_date, status, total_amount, paid (sum of that invoice\'s payments, 0 if none) and balance_due (total_amount - paid). Newest invoice first.',
      solution: `SELECT i.invoice_id, i.invoice_date, i.status, i.total_amount,
       COALESCE(pay.paid, 0) AS paid,
       i.total_amount - COALESCE(pay.paid, 0) AS balance_due
FROM invoices i
LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid
           FROM payments
           GROUP BY invoice_id) pay ON pay.invoice_id = i.invoice_id
WHERE i.patient_id = 3
ORDER BY i.invoice_date DESC;`,
      hints: ['Start from invoices WHERE patient_id = 3.', 'Pre-aggregate payments per invoice in a subquery (SUM(amount) GROUP BY invoice_id) so the join cannot multiply rows.', 'LEFT JOIN that subquery and use COALESCE(pay.paid, 0) for invoices without payments.', 'balance_due = i.total_amount - COALESCE(pay.paid, 0); ORDER BY i.invoice_date DESC.'],
      ordered: true,
    },
    quiz: [
      { q: 'Why use a connection pool?', options: ['It encrypts queries', 'Opening connections is expensive; a pool reuses a small number of them', 'It prevents SQL injection', 'It replaces transactions'], answer: 1, why: 'Connection setup (network, TLS, auth, backend process) is costly and the DB handles limited concurrency.' },
      { q: 'An ORM loads 50 invoices, then one query per invoice to fetch its payor. What is this called?', options: ['Eager loading', 'The N+1 query problem', 'Connection leak', 'Deadlock'], answer: 1, why: 'Fix it with eager loading (JOIN or one IN query).' },
      { q: 'The API /patients/7/invoices uses a bound parameter for 7 taken from the URL, without checking the logged-in user. What is the risk?', options: ['SQL injection', 'None, it is parameterized', 'Insecure direct object reference: users can read other patients\' bills', 'N+1 queries'], answer: 2, why: 'Parameters stop injection, not authorization bugs. Use the id from the authenticated session.' },
    ],
  },
]);
