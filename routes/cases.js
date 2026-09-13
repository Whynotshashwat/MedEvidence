import { Router } from "express";
import { v4 as uuid } from "uuid";
import { createHash } from "crypto";
import { CooL, verifyEvidence } from "cool-nwc";
import { getDb } from "../db/init.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { auditLog } from "../middleware/audit.js";

const router = Router();
router.use(requireAuth);

// CooL SDK singleton
const cool = new CooL({ applicationId: "medevidence-prod" });
let coolReady = false;

async function ensureCool() {
  if (!coolReady) {
    await cool.ready();
    coolReady = true;
    console.log("[cool] SDK initialized (simulated mode)");
  }
}

function computeBindingHash(vitals, recommendation) {
  return createHash("sha256")
    .update(JSON.stringify({ vitals, recommendation }))
    .digest("hex");
}

function mockModel(vitals) {
  let score = 0;
  if (vitals.heartRate > 120) score += 30;
  if (vitals.respRate > 24) score += 25;
  if (vitals.temp > 38.5 || vitals.temp < 36) score += 25;
  if (vitals.systolicBP < 90) score += 20;
  return {
    score,
    recommend: score > 50 ? "Escalate — possible sepsis" : "Continue monitoring",
  };
}

// List cases with filters
router.get("/", (req, res) => {
  const db = getDb();
  const { patient_id, status, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const conditions = [];
  const params = [];

  if (patient_id) { conditions.push("c.patient_id = ?"); params.push(patient_id); }
  if (status) { conditions.push("c.status = ?"); params.push(status); }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const cases = db.prepare(`
    SELECT c.*, p.first_name, p.last_name, p.mrn, p.dob,
           u.full_name as created_by_name,
           r.score, r.recommend,
           e.record_id, e.digest, e.binding_hash
    FROM cases c
    LEFT JOIN patients p ON c.patient_id = p.id
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN recommendations r ON r.case_id = c.id
    LEFT JOIN evidence e ON e.case_id = c.id
    ${where}
    ORDER BY c.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as c FROM cases c ${where}`).get(...params).c;
  res.json({ cases, total, page: Number(page), limit: Number(limit) });
});

// Get single case with full details
router.get("/:id", (req, res) => {
  const db = getDb();
  const caseData = db.prepare(`
    SELECT c.*, p.first_name, p.last_name, p.mrn, p.dob, p.sex,
           u.full_name as created_by_name
    FROM cases c
    LEFT JOIN patients p ON c.patient_id = p.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!caseData) return res.status(404).json({ error: "Case not found" });

  const vitals = db.prepare("SELECT * FROM vitals WHERE case_id = ? ORDER BY recorded_at DESC").all(req.params.id);
  const recommendations = db.prepare("SELECT * FROM recommendations WHERE case_id = ? ORDER BY created_at DESC").all(req.params.id);
  const evidenceRecords = db.prepare("SELECT id, case_id, record_id, execution_id, digest, binding_hash, created_at FROM evidence WHERE case_id = ? ORDER BY created_at DESC").all(req.params.id);

  res.json({ ...caseData, vitals, recommendations, evidence: evidenceRecords });
});

// Create case — run mock AI triage and produce CooL evidence
router.post("/", async (req, res) => {
  try {
    await ensureCool();

    const { patient_id, vitals: vitalsInput } = req.body;
    if (!patient_id || !vitalsInput) {
      return res.status(400).json({ error: "patient_id and vitals are required" });
    }

    const db = getDb();
    const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(patient_id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // Validate vitals
    const { heartRate, respRate, temp, systolicBP } = vitalsInput;
    if (typeof heartRate !== "number" || heartRate < 0 || heartRate > 400 ||
        typeof respRate !== "number" || respRate < 0 || respRate > 100 ||
        typeof temp !== "number" || temp < 30 || temp > 45 ||
        typeof systolicBP !== "number" || systolicBP < 0 || systolicBP > 300) {
      return res.status(400).json({ error: "Invalid vitals: heartRate (0-400), respRate (0-100), temp (30-45), systolicBP (0-300)" });
    }

    // Generate case number using MAX to avoid collisions
    const maxCase = db.prepare("SELECT MAX(CAST(SUBSTR(case_number, 4) AS INTEGER)) as max_num FROM cases").get();
    const nextNum = (maxCase.max_num || 0) + 1;
    const caseNumber = `ME-${String(nextNum).padStart(5, "0")}`;

    // Run mock model
    const recommendation = mockModel(vitalsInput);

    // Record evidence via CooL
    const { evidence, recordId, executionId, digest } = await cool.record({
      type: "model.execution",
      metadata: {
        model: "medevidence-triage-v1",
        caseNumber,
        patient_mrn: patient.mrn,
        timestamp: new Date().toISOString(),
      },
      payloads: {
        input: JSON.stringify(vitalsInput),
        output: JSON.stringify(recommendation),
      },
      software: { name: "medevidence-triage", version: "2.0.0", digest: null },
    });

    // Transaction: create case + vitals + recommendation + evidence
    const caseId = uuid();
    const vitalsId = uuid();
    const recId = uuid();
    const evId = uuid();
    const bindingHash = computeBindingHash(vitalsInput, recommendation);

    const insertAll = db.transaction(() => {
      db.prepare(
        "INSERT INTO cases (id, patient_id, case_number, status, created_by) VALUES (?, ?, ?, ?, ?)"
      ).run(caseId, patient_id, caseNumber, "open", req.user.id);

      db.prepare(
        "INSERT INTO vitals (id, case_id, heart_rate, resp_rate, temp, systolic_bp) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(vitalsId, caseId, vitalsInput.heartRate, vitalsInput.respRate, vitalsInput.temp, vitalsInput.systolicBP);

      db.prepare(
        "INSERT INTO recommendations (id, case_id, score, recommend, model_version) VALUES (?, ?, ?, ?, ?)"
      ).run(recId, caseId, recommendation.score, recommendation.recommend, "medevidence-triage-v1");

      db.prepare(
        "INSERT INTO evidence (id, case_id, record_id, execution_id, digest, evidence_json, binding_hash) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(evId, caseId, recordId, executionId, JSON.stringify(digest), JSON.stringify(evidence), bindingHash);

      if (recommendation.score > 50) {
        db.prepare("UPDATE cases SET status = 'escalated' WHERE id = ?").run(caseId);
      }
    });

    insertAll();
    auditLog(req, "case.create", "case", caseId, { caseNumber, patient_mrn: patient.mrn, score: recommendation.score });

    res.status(201).json({
      case: { id: caseId, case_number: caseNumber, status: recommendation.score > 50 ? "escalated" : "open" },
      recommendation,
      evidence: { recordId, executionId, digest },
    });
  } catch (err) {
    console.error("[/cases] error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Verify case evidence
router.post("/:id/verify", async (req, res) => {
  try {
    await ensureCool();

    const db = getDb();
    const evRow = db.prepare("SELECT * FROM evidence WHERE case_id = ? ORDER BY created_at DESC LIMIT 1").get(req.params.id);
    if (!evRow) return res.status(404).json({ error: "No evidence found for this case" });

    const caseRow = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
    if (!caseRow) return res.status(404).json({ error: "Case not found" });

    const vitalsRow = db.prepare("SELECT * FROM vitals WHERE case_id = ? ORDER BY recorded_at DESC LIMIT 1").get(req.params.id);
    const recRow = db.prepare("SELECT * FROM recommendations WHERE case_id = ? ORDER BY created_at DESC LIMIT 1").get(req.params.id);

    const evidence = JSON.parse(evRow.evidence_json);
    const verdict = await verifyEvidence(evidence);

    // Overlay binding check
    if (vitalsRow && recRow) {
      const currentHash = computeBindingHash(
        { heartRate: vitalsRow.heart_rate, respRate: vitalsRow.resp_rate, temp: vitalsRow.temp, systolicBP: vitalsRow.systolic_bp },
        { score: recRow.score, recommend: recRow.recommend }
      );
      if (currentHash !== evRow.binding_hash) {
        verdict.ok = false;
        verdict.checks.binding = { status: "fail", detail: "Data binding mismatch: EHR data does not match original commitment" };
        verdict.reasons = [...(verdict.reasons || []), "binding: recomputed binding_hash does not match the receipt — EHR data was tampered with"];
      }
    }

    auditLog(req, "case.verify", "case", req.params.id, { ok: verdict.ok });
    res.json(verdict);
  } catch (err) {
    console.error("[/cases/:id/verify] error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Tamper case — simulate post-hoc record modification
router.post("/:id/tamper", requireRole("admin", "auditor"), (req, res) => {
  const db = getDb();
  const caseData = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
  if (!caseData) return res.status(404).json({ error: "Case not found" });

  const recRow = db.prepare("SELECT * FROM recommendations WHERE case_id = ? ORDER BY created_at DESC LIMIT 1").get(req.params.id);
  if (!recRow) return res.status(404).json({ error: "No recommendation found" });

  // Mutate the recommendation
  db.prepare("UPDATE recommendations SET score = ?, recommend = ? WHERE id = ?").run(20, "Continue monitoring", recRow.id);

  // Also update vitals to look normal
  const vitalsRow = db.prepare("SELECT * FROM vitals WHERE case_id = ? ORDER BY recorded_at DESC LIMIT 1").get(req.params.id);
  if (vitalsRow) {
    db.prepare("UPDATE vitals SET heart_rate = ?, resp_rate = ?, temp = ?, systolic_bp = ? WHERE id = ?").run(72, 16, 36.8, 120, vitalsRow.id);
  }

  db.prepare("UPDATE cases SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  auditLog(req, "case.tamper", "case", req.params.id, { note: "Simulated post-hoc record tampering" });
  res.json({ tampered: true });
});

// Update case status
router.patch("/:id/status", (req, res) => {
  const { status } = req.body;
  if (!["open", "escalated", "resolved", "closed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const db = getDb();
  const caseData = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
  if (!caseData) return res.status(404).json({ error: "Case not found" });

  db.prepare("UPDATE cases SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
  auditLog(req, "case.status", "case", req.params.id, { from: caseData.status, to: status });
  res.json({ id: req.params.id, status });
});

export default router;
