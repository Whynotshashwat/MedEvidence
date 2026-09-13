-- MedEvidence v2 — Production Schema
-- SQLite3

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','doctor','nurse','auditor')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  mrn TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  sex TEXT CHECK(sex IN ('M','F','Other')) NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  case_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','escalated','resolved','closed')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vitals (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  heart_rate INTEGER NOT NULL,
  resp_rate INTEGER NOT NULL,
  temp REAL NOT NULL,
  systolic_bp INTEGER NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  score INTEGER NOT NULL,
  recommend TEXT NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'medevidence-triage-v1',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  record_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  digest TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  binding_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  username TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cases_patient ON cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_case ON vitals(case_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_case ON recommendations(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
