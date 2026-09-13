#!/usr/bin/env node
/**
 * MedEvidence v2 — Full acceptance test
 * Tests: auth, patients, cases, evidence verification, tamper detection, audit
 * Usage: node test.mjs (server must be running on localhost:3000)
 */

const BASE = "http://localhost:3000/api";
let token = "";
let patientId = "";
let caseId = "";

async function api(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  return { status: res.status, json };
}

let passed = 0, failed = 0;
function assert(label, cond) {
  if (cond) { console.log(`  PASS  ${label}`); passed++; }
  else { console.log(`  FAIL  ${label}`); failed++; }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Auth ────────────────────────────────────────────────────────────────────
console.log("\n=== 1. Authentication ===");
{
  const r = await api("POST", "/auth/login", { username: "admin", password: "admin123" });
  assert("Login admin returns 200", r.status === 200);
  assert("Token returned", !!r.json.token);
  token = r.json.token;

  const me = await api("GET", "/auth/me");
  assert("GET /auth/me returns 200", me.status === 200);
  assert("User is admin", me.json.user.role === "admin");

  const bad = await api("POST", "/auth/login", { username: "admin", password: "wrong" });
  assert("Bad password returns 401", bad.status === 401);
}

// ── Patients ────────────────────────────────────────────────────────────────
console.log("\n=== 2. Patients ===");
{
  const r = await api("POST", "/patients", {
    mrn: `MRN-${Date.now()}`, first_name: "John", last_name: "Doe",
    dob: "1985-03-15", sex: "M"
  });
  assert("Create patient returns 201", r.status === 201);
  patientId = r.json.id;

  const list = await api("GET", "/patients");
  assert("List patients returns 200", list.status === 200);
  assert("At least 1 patient", list.json.total >= 1);

  const detail = await api("GET", `/patients/${patientId}`);
  assert("Get patient returns 200", detail.status === 200);
  assert("Patient name matches", detail.json.first_name === "John");

  const search = await api("GET", "/patients?search=Doe");
  assert("Search by name works", search.json.patients.length >= 1);
}

// ── Cases + Evidence ────────────────────────────────────────────────────────
console.log("\n=== 3. Cases + CooL Evidence (3 rounds) ===");
for (let round = 1; round <= 3; round++) {
  console.log(`\n  --- Round ${round} ---`);
  const vitals = { heartRate: 130, respRate: 26, temp: 39.1, systolicBP: 85 };

  const c = await api("POST", "/cases", { patient_id: patientId, vitals });
  assert(`Round ${round}: Create case returns 201`, c.status === 201);
  assert(`Round ${round}: case_number exists`, !!c.json.case?.case_number);
  assert(`Round ${round}: score == 100`, c.json.recommendation?.score === 100);
  assert(`Round ${round}: recommend == Escalate`, c.json.recommendation?.recommend === "Escalate — possible sepsis");
  assert(`Round ${round}: evidence.recordId exists`, !!c.json.evidence?.recordId);
  caseId = c.json.case.id;

  // Verify (untouched)
  const v1 = await api("POST", `/cases/${caseId}/verify`);
  assert(`Round ${round}: Verify returns 200`, v1.status === 200);
  assert(`Round ${round}: verdict.ok == true`, v1.json.ok === true);
  assert(`Round ${round}: signature == pass`, v1.json.checks?.signature?.status === "pass");
  assert(`Round ${round}: binding == pass`, v1.json.checks?.binding?.status === "pass");

  // Tamper
  const t = await api("POST", `/cases/${caseId}/tamper`);
  assert(`Round ${round}: Tamper returns 200`, t.status === 200);
  assert(`Round ${round}: tampered == true`, t.json.tampered === true);

  // Verify (tampered)
  const v2 = await api("POST", `/cases/${caseId}/verify`);
  assert(`Round ${round}: Verify returns 200`, v2.status === 200);
  assert(`Round ${round}: verdict.ok == false`, v2.json.ok === false);
  assert(`Round ${round}: binding check failed`, v2.json.checks?.binding?.status === "fail");
}

// ── Dashboard ───────────────────────────────────────────────────────────────
console.log("\n=== 4. Dashboard ===");
{
  const d = await api("GET", "/dashboard");
  assert("Dashboard returns 200", d.status === 200);
  assert("Has stats", !!d.json.stats);
  assert("totalCases >= 3", d.json.stats.totalCases >= 3);
}

// ── Audit Log ───────────────────────────────────────────────────────────────
console.log("\n=== 5. Audit Log ===");
{
  const a = await api("GET", "/audit");
  assert("Audit log returns 200", a.status === 200);
  assert("Has logs", a.json.logs.length > 0);

  const stats = await api("GET", "/audit/stats");
  assert("Audit stats returns 200", stats.status === 200);
  assert("Has byAction", Array.isArray(stats.json.byAction));
}

// ── Role-based access ──────────────────────────────────────────────────────
console.log("\n=== 6. Role-Based Access ===");
{
  // Login as auditor
  const login = await api("POST", "/auth/login", { username: "auditor", password: "audit123" });
  const auditorToken = login.json.token;
  const savedToken = token;
  token = auditorToken;

  const a = await api("GET", "/audit");
  assert("Auditor can read audit log", a.status === 200);

  // Auditor cannot create patients
  const p = await api("POST", "/patients", { mrn: "X", first_name: "X", last_name: "X", dob: "2000-01-01" });
  assert("Auditor cannot create patients", p.status === 403);

  token = savedToken;
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${"=".repeat(50)}\n`);
process.exit(failed > 0 ? 1 : 0);
