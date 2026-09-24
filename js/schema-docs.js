// Scope and meaning of every table in the Healthcare Billing sample database.
// Used by the ER diagram, the database explorer and the lessons.
window.SchemaDocs = {
  tables: {
    sites: {
      icon: '🏢', group: 'Organization',
      purpose: 'A physical facility or campus where the organization operates: an address that has its own facility NPI and bills under a tax ID.',
      grain: 'One row per physical facility / campus.',
      scope: 'In scope: facility identity (name, address), billing identifiers (facility NPI, tax ID), and the default place-of-service code used on claims. Out of scope: departments and units (those are treatment_locations), people (practitioners) and money (invoices). A site can exist before it has any units, e.g. the planned Westlake Surgery Center.',
      columns: {
        site_id: 'Surrogate primary key.',
        site_name: 'Facility name. Unique.',
        site_type: "Hospital Campus, Medical Office Building or Standalone Center (CHECK constraint).",
        address_line: 'Street address of the facility.',
        city: 'City.', state: 'State code.', zip_code: 'ZIP code.',
        facility_npi: 'Organizational (Type 2) NPI printed on facility claims. Unique; NULL until the site is enrolled.',
        tax_id: 'EIN of the legal billing entity. Not unique: several sites can bill under the same entity.',
        default_pos_code: "CMS place-of-service code billed by default: 22 outpatient hospital, 11 office, 20 urgent care, 24 ambulatory surgery.",
        phone: 'Main phone (nullable).',
        is_active: '1 = operating, 0 = planned or closed.',
      },
    },
    treatment_locations: {
      icon: '🏥', group: 'Organization',
      purpose: 'A care unit or department inside a site where services are delivered: a clinic, a hospital department, urgent care or a telehealth hub.',
      grain: 'One row per unit of care.',
      scope: 'Each location belongs to exactly one site (site_id NOT NULL). Practitioners are based at a location, and every invoice is issued by a location.',
      columns: {
        location_id: 'Surrogate primary key.', location_name: 'Unit name.', location_type: 'Clinic, Hospital, Urgent Care or Telehealth.',
        city: 'City.', state: 'State.', opened_date: 'Date the unit opened.', site_id: 'FK → sites. The facility this unit operates in.',
      },
    },
    practitioners: {
      icon: '🩺', group: 'Organization',
      purpose: 'Clinicians who perform billable services.',
      grain: 'One row per practitioner.',
      scope: 'Based at one treatment location. supervisor_id points to another practitioner (self-reference) to form the reporting hierarchy.',
      columns: {
        practitioner_id: 'Surrogate primary key.', first_name: 'First name.', last_name: 'Last name.', specialty: 'Clinical specialty.',
        npi: 'Individual (Type 1) NPI. Unique; NULL for a new hire not yet enrolled.', location_id: 'FK → treatment_locations. Home unit.',
        supervisor_id: 'FK → practitioners. Their supervisor; NULL for the top of the hierarchy.', hire_date: 'Hire date.', hourly_rate: 'Pay rate.',
      },
    },
    payors: {
      icon: '🏦', group: 'Parties',
      purpose: 'Insurers and other parties that pay claims: commercial, Medicare, Medicaid, workers comp, and self-pay.',
      grain: 'One row per payor.',
      scope: 'contract_rate is the share of the billed amount the payor reimburses. Referenced by patients (primary coverage), invoices (who is billed) and payments (who paid).',
      columns: {
        payor_id: 'Surrogate primary key.', payor_name: 'Name. Unique.', payor_type: 'Commercial, Medicare, Medicaid, Workers Comp or Self-Pay.',
        phone: 'Claims phone (nullable).', contract_rate: 'Reimbursed fraction of charges (0.80 = 80%).', is_active: '1 = active contract.',
      },
    },
    patients: {
      icon: '🧑', group: 'Parties',
      purpose: 'People who receive care and are billed for it.',
      grain: 'One row per patient record. Patient 25 is a deliberate duplicate of patient 1.',
      scope: 'Demographics and primary insurance. Clinical detail beyond allergies is out of scope.',
      columns: {
        patient_id: 'Surrogate primary key.', first_name: 'First name.', last_name: 'Last name.', date_of_birth: 'Date of birth (PHI).',
        gender: 'Gender.', city: 'City (nullable).', email: 'Email (nullable, PHI).', allergies: 'Free-text allergies (nullable).',
        primary_payor_id: 'FK → payors. Primary insurance; NULL = uninsured.',
      },
    },
    invoices: {
      icon: '🧾', group: 'Billing',
      purpose: 'A bill for one patient visit, issued by a treatment location and addressed to a payor.',
      grain: 'One row per invoice (per patient encounter).',
      scope: 'The hub of the model: links patient, payor and location. Its lines are charges; money received is recorded in payments; every financial event is also posted to the transactions ledger.',
      columns: {
        invoice_id: 'Surrogate primary key.', patient_id: 'FK → patients (required).', payor_id: 'FK → payors (nullable = self-pay).',
        location_id: 'FK → treatment_locations (required).', invoice_date: 'Date issued.', due_date: 'Payment due date.',
        status: 'Open, Paid, Partially Paid, Overdue or Void.', total_amount: 'Sum of its charges.',
      },
    },
    charges: {
      icon: '💉', group: 'Billing',
      purpose: 'The line items on an invoice: one billed service (CPT code) performed by a practitioner.',
      grain: 'One row per service line.',
      scope: 'Also acts as the junction that connects invoices and practitioners many-to-many.',
      columns: {
        charge_id: 'Surrogate primary key.', invoice_id: 'FK → invoices.', practitioner_id: 'FK → practitioners (who performed it).',
        service_date: 'Date of service.', cpt_code: 'Procedure code.', description: 'Procedure description.', units: 'Units billed.',
        unit_price: 'Price per unit.', amount: 'units × unit_price.',
      },
    },
    payments: {
      icon: '💳', group: 'Money',
      purpose: 'Money received against an invoice, from a payor or from the patient.',
      grain: 'One row per payment received.',
      scope: 'payor_id NULL means the patient paid. Includes one deliberate duplicate payment that is later refunded.',
      columns: {
        payment_id: 'Surrogate primary key.', invoice_id: 'FK → invoices.', payor_id: 'FK → payors (NULL = patient).',
        payment_date: 'Date received.', amount: 'Amount.', method: 'EFT, Check, Credit Card or Cash.',
      },
    },
    transactions: {
      icon: '📒', group: 'Money',
      purpose: 'The accounting ledger: every financial event on an invoice, as a signed amount.',
      grain: 'One row per ledger posting.',
      scope: 'CHARGE (+), PAYMENT (−), ADJUSTMENT (−), REFUND (+), WRITE_OFF (−). The balance of an invoice = SUM(amount). reference_id points to the source charge or payment, which depends on transaction_type (a logical, unenforced link).',
      columns: {
        transaction_id: 'Surrogate primary key.', invoice_id: 'FK → invoices.', transaction_date: 'Posting date.',
        transaction_type: 'CHARGE, PAYMENT, ADJUSTMENT, REFUND or WRITE_OFF.', amount: 'Signed amount (+ raises, − lowers the balance).',
        reference_id: 'charge_id (for CHARGE) or payment_id (for PAYMENT/REFUND). Not a declared FK.', posted_by: 'User or system that posted it.',
      },
    },
  },

  // Relationships that are real but not declared as foreign keys.
  logical: [
    { from: 'transactions', col: 'reference_id', to: 'charges', tcol: 'charge_id', card: '1 : 1', when: "transaction_type = 'CHARGE'",
      text: 'Every charge is posted to the ledger exactly once as a CHARGE transaction. reference_id holds the charge_id. The link depends on transaction_type (a polymorphic association), so the database cannot enforce it with a foreign key.' },
    { from: 'transactions', col: 'reference_id', to: 'payments', tcol: 'payment_id', card: '1 : 1', when: "transaction_type = 'PAYMENT'",
      text: 'Every payment posts one PAYMENT transaction whose reference_id is the payment_id. A REFUND also points at the payment it reverses.' },
  ],

  // Derived one-to-many roll-ups: true in the data because every step of the path is N : 1,
  // but NOT stored as a column (storing site_id on invoices would duplicate location → site).
  rollups: [
    { a: 'sites', b: 'invoices', via: ['treatment_locations'], text: 'Each invoice is issued by one treatment location, and each location belongs to one site, so every invoice rolls up to exactly one site. One site has many invoices.' },
    { a: 'sites', b: 'transactions', via: ['treatment_locations', 'invoices'], text: 'Each ledger posting belongs to one invoice, which rolls up to one site. One site has many transactions.' },
    { a: 'sites', b: 'payments', via: ['treatment_locations', 'invoices'], text: 'Each payment is applied to one invoice, which rolls up to one site. One site has many payments.' },
    { a: 'sites', b: 'practitioners', via: ['treatment_locations'], text: 'Each practitioner is based at one location, and so at one site. One site has many practitioners.' },
  ],

  // Many-to-many relationships that exist through a junction table or path.
  derived: [
    { a: 'invoices', b: 'practitioners', via: ['charges'], text: 'An invoice can have lines from several practitioners, and a practitioner appears on many invoices. The charges table is the junction.' },
    { a: 'patients', b: 'payors', via: ['invoices'], text: 'A patient can be billed to different payors over time, and a payor covers many patients. Invoices connect them (separately, primary_payor_id is a direct N : 1).' },
    { a: 'sites', b: 'patients', via: ['treatment_locations', 'invoices'], text: 'A site treats many patients, and a patient can visit several sites. Path: sites → treatment_locations → invoices → patients.' },
    { a: 'patients', b: 'practitioners', via: ['invoices', 'charges'], text: 'Patients are treated by many practitioners, and each practitioner treats many patients. Path: patients → invoices → charges → practitioners.' },
  ],
};
