// Generates js/seed.js — the deterministic Healthcare Billing sample database.
// Run: node tools/build-seed.js
const fs = require('fs');
const path = require('path');

let s = 20260924;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const money = (n) => Math.round(n * 100) / 100;
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const TODAY = '2026-09-01';

const schema = `
CREATE TABLE payors (
  payor_id      INTEGER PRIMARY KEY,
  payor_name    TEXT NOT NULL UNIQUE,
  payor_type    TEXT NOT NULL CHECK (payor_type IN ('Commercial','Medicare','Medicaid','Workers Comp','Self-Pay')),
  phone         TEXT,
  contract_rate REAL NOT NULL,          -- share of billed amount the payor reimburses (0.80 = 80%)
  is_active     INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE sites (
  site_id          INTEGER PRIMARY KEY,
  site_name        TEXT NOT NULL UNIQUE,
  site_type        TEXT NOT NULL CHECK (site_type IN ('Hospital Campus','Medical Office Building','Standalone Center')),
  address_line     TEXT NOT NULL,
  city             TEXT NOT NULL,
  state            TEXT NOT NULL,
  zip_code         TEXT NOT NULL,
  facility_npi     TEXT UNIQUE,          -- organizational (Type 2) NPI printed on facility claims; NULL until enrolled
  tax_id           TEXT NOT NULL,        -- EIN of the billing entity; several sites can share one
  default_pos_code TEXT NOT NULL,        -- CMS place-of-service code billed by default (22, 11, 20, 24...)
  phone            TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE treatment_locations (
  location_id   INTEGER PRIMARY KEY,
  location_name TEXT NOT NULL,
  location_type TEXT NOT NULL,         -- Clinic, Hospital, Urgent Care, Telehealth
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  opened_date   TEXT NOT NULL,
  site_id       INTEGER NOT NULL REFERENCES sites(site_id)   -- the facility this unit operates in
);
CREATE TABLE practitioners (
  practitioner_id INTEGER PRIMARY KEY,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  specialty       TEXT NOT NULL,
  npi             TEXT UNIQUE,
  location_id     INTEGER REFERENCES treatment_locations(location_id),
  supervisor_id   INTEGER REFERENCES practitioners(practitioner_id),
  hire_date       TEXT NOT NULL,
  hourly_rate     REAL
);
CREATE TABLE patients (
  patient_id       INTEGER PRIMARY KEY,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  date_of_birth    TEXT NOT NULL,
  gender           TEXT,
  city             TEXT,
  email            TEXT,
  allergies        TEXT,
  primary_payor_id INTEGER REFERENCES payors(payor_id)
);
CREATE TABLE invoices (
  invoice_id   INTEGER PRIMARY KEY,
  patient_id   INTEGER NOT NULL REFERENCES patients(patient_id),
  payor_id     INTEGER REFERENCES payors(payor_id),
  location_id  INTEGER NOT NULL REFERENCES treatment_locations(location_id),
  invoice_date TEXT NOT NULL,
  due_date     TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('Open','Paid','Partially Paid','Overdue','Void')),
  total_amount REAL NOT NULL DEFAULT 0
);
CREATE TABLE charges (
  charge_id       INTEGER PRIMARY KEY,
  invoice_id      INTEGER NOT NULL REFERENCES invoices(invoice_id),
  practitioner_id INTEGER NOT NULL REFERENCES practitioners(practitioner_id),
  service_date    TEXT NOT NULL,
  cpt_code        TEXT NOT NULL,
  description     TEXT NOT NULL,
  units           INTEGER NOT NULL DEFAULT 1,
  unit_price      REAL NOT NULL,
  amount          REAL NOT NULL
);
CREATE TABLE payments (
  payment_id   INTEGER PRIMARY KEY,
  invoice_id   INTEGER NOT NULL REFERENCES invoices(invoice_id),
  payor_id     INTEGER REFERENCES payors(payor_id),   -- NULL = paid by the patient
  payment_date TEXT NOT NULL,
  amount       REAL NOT NULL,
  method       TEXT NOT NULL
);
CREATE TABLE transactions (
  transaction_id   INTEGER PRIMARY KEY,
  invoice_id       INTEGER NOT NULL REFERENCES invoices(invoice_id),
  transaction_date TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CHARGE','PAYMENT','ADJUSTMENT','REFUND','WRITE_OFF')),
  amount           REAL NOT NULL,       -- + increases balance owed, - decreases it
  reference_id     INTEGER,             -- charge_id or payment_id this entry came from
  posted_by        TEXT
);
`;

const payors = [
  [1, 'BlueShield Health', 'Commercial', '800-555-0101', 0.8, 1],
  [2, 'Aetna Care', 'Commercial', '800-555-0102', 0.75, 1],
  [3, 'Medicare Part B', 'Medicare', '800-555-0103', 0.65, 1],
  [4, 'State Medicaid', 'Medicaid', '800-555-0104', 0.55, 1],
  [5, 'United Workers Comp', 'Workers Comp', null, 0.9, 1],
  [6, 'Cigna Select', 'Commercial', '800-555-0106', 0.78, 0],
  [7, 'Self-Pay', 'Self-Pay', null, 1.0, 1],
];
// id, name, type, address, city, state, zip, facility NPI, tax id (EIN), default POS, phone, active
const sites = [
  [1, 'St. Mary Medical Campus', 'Hospital Campus', '1200 Red River St', 'Austin', 'TX', '78701', '1902001001', '74-1234567', '22', '512-555-0100', 1],
  [2, 'Downtown Medical Plaza', 'Medical Office Building', '500 Congress Ave', 'Austin', 'TX', '78701', '1902001002', '74-1234567', '11', '512-555-0200', 1],
  [3, 'Northside Health Center', 'Standalone Center', '2100 N Mays St', 'Round Rock', 'TX', '78664', '1902001003', '74-7654321', '20', '512-555-0300', 1],
  [4, 'Lakeview Medical Pavilion', 'Medical Office Building', '8300 Lake Park Blvd', 'Dallas', 'TX', '75214', '1902001004', '75-2223333', '11', '214-555-0400', 1],
  [5, 'Eastside Community Campus', 'Medical Office Building', '4100 Lyons Ave', 'Houston', 'TX', '77020', '1902001005', '76-4445555', '11', null, 1],
  [6, 'Westlake Surgery Center', 'Standalone Center', '3600 Bee Cave Rd', 'Austin', 'TX', '78746', null, '74-1234567', '24', null, 0], // planned: no locations yet
];
// id, name, type, city, state, opened, site
const locations = [
  [1, 'Downtown Medical Clinic', 'Clinic', 'Austin', 'TX', '2015-03-01', 2],
  [2, 'St. Mary General Hospital', 'Hospital', 'Austin', 'TX', '2008-06-15', 1],
  [3, 'Northside Urgent Care', 'Urgent Care', 'Round Rock', 'TX', '2019-09-10', 3],
  [4, 'Lakeview Physical Therapy', 'Clinic', 'Dallas', 'TX', '2017-01-20', 4],
  [5, 'CareConnect Telehealth', 'Telehealth', 'Dallas', 'TX', '2021-04-05', 4],
  [6, 'Eastside Family Clinic', 'Clinic', 'Houston', 'TX', '2026-08-15', 5],
];
// id, first, last, specialty, npi, location, supervisor, hire, rate
const practitioners = [
  [1, 'Elena', 'Ramirez', 'Internal Medicine', '1003001001', 2, null, '2010-02-01', 145],
  [2, 'James', 'Okafor', 'Family Medicine', '1003001002', 1, 1, '2016-05-12', 110],
  [3, 'Priya', 'Nair', 'Cardiology', '1003001003', 2, 1, '2012-08-20', 190],
  [4, 'Marcus', 'Chen', 'Emergency Medicine', '1003001004', 3, 1, '2019-10-01', 160],
  [5, 'Sofia', 'Rossi', 'Physical Therapy', '1003001005', 4, 2, '2017-02-14', 85],
  [6, 'David', 'Kim', 'Physical Therapy', '1003001006', 4, 5, '2020-06-01', 80],
  [7, 'Aisha', 'Bello', 'Psychiatry', '1003001007', 5, 1, '2021-04-10', 150],
  [8, 'Tom', 'Walsh', 'Radiology', '1003001008', 2, 3, '2014-11-03', 175],
  [9, 'Nina', 'Patel', 'Family Medicine', '1003001009', 1, 2, '2022-01-17', 105],
  [10, 'Omar', 'Haddad', 'Emergency Medicine', '1003001010', 3, 4, '2023-03-06', 150],
  [11, 'Grace', 'Liu', 'Psychiatry', '1003001011', 5, 7, '2024-07-22', 140],
  [12, 'Leo', 'Martins', 'Family Medicine', null, 6, 2, '2026-08-18', 100], // new hire: no charges yet, no NPI yet
];
const first = ['Maria', 'John', 'Aiden', 'Chloe', 'Lucas', 'Emma', 'Noah', 'Olivia', 'Liam', 'Ava', 'Ethan', 'Mia', 'Mason', 'Zoe', 'Logan', 'Lily', 'Jacob', 'Ella', 'Henry', 'Grace', 'Samuel', 'Harper', 'Daniel', 'Aria'];
const last = ['Garcia', 'Smith', 'Johnson', 'Brown', 'Lee', 'Wilson', 'Taylor', 'Nguyen', 'Martin', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Nelson', 'Carter'];
const cities = ['Austin', 'Austin', 'Round Rock', 'Dallas', 'Dallas', 'Houston', 'Plano', null];
const allergyList = ['Penicillin', 'Peanuts', 'Latex', 'Sulfa', 'Aspirin', 'Shellfish'];
const patients = [];
for (let i = 1; i <= 24; i++) {
  const f = first[i - 1], l = last[i - 1];
  const dob = `${int(1942, 2012)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`;
  const email = rnd() < 0.8 ? `${f}.${l}@mail.com`.toLowerCase() : null;
  const allergies = rnd() < 0.35 ? pick(allergyList) : null;
  const payor = rnd() < 0.12 ? null : pick([1, 1, 2, 2, 3, 3, 4, 5, 6, 7]);
  patients.push([i, f, l, dob, ['Maria','Chloe','Emma','Olivia','Ava','Mia','Zoe','Lily','Ella','Grace','Harper','Aria'].includes(f) ? 'F' : 'M', pick(cities), email, allergies, payor]);
}
patients[0][1] = 'Maria'; patients[0][2] = 'Garcia';
// Deliberate duplicate person (same name + DOB, different id) for de-duplication lessons
patients.push([25, 'Maria', 'Garcia', patients[0][3], 'F', 'Austin', null, patients[0][7], patients[0][8]]);
patients[4][8] = null; patients[4][7] = 'Penicillin, Latex';

const cpts = {
  Clinic: [['99213', 'Office visit, established patient', 110], ['99214', 'Office visit, moderate complexity', 165], ['99203', 'New patient visit', 150], ['G0438', 'Annual wellness visit', 175], ['36415', 'Venipuncture (blood draw)', 15], ['85025', 'Complete blood count', 25]],
  Hospital: [['99223', 'Initial hospital care, high complexity', 420], ['93000', 'Electrocardiogram (ECG)', 60], ['71046', 'Chest X-ray, 2 views', 95], ['80053', 'Comprehensive metabolic panel', 40], ['36415', 'Venipuncture (blood draw)', 15]],
  'Urgent Care': [['99283', 'Emergency visit, moderate severity', 380], ['12001', 'Simple wound repair', 210], ['71046', 'Chest X-ray, 2 views', 95], ['85025', 'Complete blood count', 25]],
  PT: [['97110', 'Therapeutic exercise (15 min)', 45], ['97140', 'Manual therapy (15 min)', 50], ['97161', 'PT evaluation, low complexity', 130]],
  Telehealth: [['90834', 'Psychotherapy, 45 minutes', 130], ['90837', 'Psychotherapy, 60 minutes', 175], ['99213', 'Office visit, established patient', 110]],
};
const pracAt = (loc) => practitioners.filter((p) => p[5] === loc && p[0] !== 12).map((p) => p[0]);
const noInvoicePatients = new Set([9, 17, 22]);
const invPatients = patients.map((p) => p[0]).filter((id) => !noInvoicePatients.has(id));

const invoices = [], charges = [], payments = [], txns = [];
let chargeId = 1, payId = 1, txId = 1;
const users = ['billing.amy', 'billing.raj', 'system'];
for (let i = 1; i <= 48; i++) {
  const pid = pick(invPatients);
  const pat = patients[pid - 1];
  const loc = pick([1, 1, 2, 2, 3, 4, 4, 5]);
  const invDate = addDays('2025-01-06', Math.min(599, int(0, 640)));
  const due = addDays(invDate, 30);
  const payor = pat[8];
  const inv = [i, pid, payor, loc, invDate, due, 'Open', 0];
  invoices.push(inv);
  if (i === 37) { inv[6] = 'Void'; continue; } // voided invoice: no charges
  const set = loc === 4 ? cpts.PT : loc === 5 ? cpts.Telehealth : loc === 3 ? cpts['Urgent Care'] : loc === 2 ? cpts.Hospital : cpts.Clinic;
  const n = int(1, 4);
  let total = 0;
  for (let k = 0; k < n; k++) {
    const [code, desc, price] = pick(set);
    const units = code.startsWith('971') && code !== '97161' ? int(1, 4) : 1;
    const svc = addDays(invDate, -int(0, 3));
    const amt = money(units * price);
    total += amt;
    charges.push([chargeId, i, pick(pracAt(loc)), svc, code, desc, units, price, amt]);
    txns.push([txId++, i, svc, 'CHARGE', amt, chargeId, 'system']);
    chargeId++;
  }
  total = money(total);
  inv[7] = total;
  const r = rnd();
  const rate = payor ? payors[payor - 1][4] : 1;
  const addPay = (payorId, amt, date) => {
    const method = payorId ? pick(['EFT', 'EFT', 'Check']) : pick(['Credit Card', 'Cash', 'Credit Card']);
    payments.push([payId, i, payorId, date, money(amt), method]);
    txns.push([txId++, i, date, 'PAYMENT', -money(amt), payId, pick(users)]);
    payId++;
  };
  if (r < 0.5 && invDate < '2026-07-15') {
    // fully paid: payor pays its contracted share, patient pays the remainder
    const d1 = addDays(invDate, int(10, 40));
    if (payor && payor !== 7) {
      const share = money(total * rate);
      addPay(payor, share, d1);
      if (total - share > 0.009) addPay(null, total - share, addDays(d1, int(3, 25)));
    } else addPay(null, total, d1);
    inv[6] = 'Paid';
  } else if (r < 0.72 && invDate < '2026-08-01') {
    const d1 = addDays(invDate, int(12, 45));
    if (payor && payor !== 7) addPay(payor, money(total * rate), d1);
    else addPay(null, money(total * 0.4), d1);
    inv[6] = 'Partially Paid';
  } else {
    inv[6] = due < TODAY ? 'Overdue' : 'Open';
  }
}
// Scenario: duplicate payment posted twice, later refunded (overpayment / dedup lessons)
{
  const paid = invoices.find((v) => v[6] === 'Paid' && payments.some((p) => p[1] === v[0] && p[2] === null));
  const p = payments.find((x) => x[1] === paid[0] && x[2] === null);
  payments.push([payId, paid[0], null, p[3], p[4], p[5]]);
  txns.push([txId++, paid[0], p[3], 'PAYMENT', -p[4], payId, 'billing.raj']);
  payId++;
  txns.push([txId++, paid[0], addDays(p[3], 9), 'REFUND', p[4], payId - 1, 'billing.amy']);
}
// Scenario: old overdue invoice partly written off; a contractual adjustment on a partial one
{
  const od = invoices.filter((v) => v[6] === 'Overdue').sort((a, b) => (a[4] < b[4] ? -1 : 1))[0];
  txns.push([txId++, od[0], addDays(od[5], 120), 'WRITE_OFF', -money(od[7] * 0.5), null, 'billing.amy']);
  const pp = invoices.find((v) => v[6] === 'Partially Paid' && v[2]);
  txns.push([txId++, pp[0], [addDays(pp[4], 50), TODAY].sort()[0], 'ADJUSTMENT', -money(pp[7] * 0.1), null, 'billing.raj']);
}
txns.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[0] - b[0]));
txns.forEach((t, i) => (t[0] = i + 1));

const ins = (table, rows) => rows.map((r) => `INSERT INTO ${table} VALUES (${r.map(q).join(', ')});`).join('\n');
const sql = [schema,
  ins('payors', payors), ins('sites', sites), ins('treatment_locations', locations), ins('practitioners', practitioners),
  ins('patients', patients), ins('invoices', invoices), ins('charges', charges),
  ins('payments', payments), ins('transactions', txns)].join('\n');

const out = `// AUTO-GENERATED by tools/build-seed.js — Healthcare Billing sample database.
window.SEED_SQL = ${JSON.stringify(sql)};
`;
fs.writeFileSync(path.join(__dirname, '..', 'js', 'seed.js'), out);
fs.writeFileSync(path.join(__dirname, 'seed.sql'), sql);
console.log(`patients ${patients.length}, invoices ${invoices.length}, charges ${charges.length}, payments ${payments.length}, transactions ${txns.length}`);
