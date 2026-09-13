import { Router } from "express";
import { v4 as uuid } from "uuid";
import { getDb } from "../db/init.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { auditLog } from "../middleware/audit.js";

const router = Router();
router.use(requireAuth);

// List patients with optional search
router.get("/", (req, res) => {
  const db = getDb();
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let patients, total;
  if (search) {
    const q = `%${search}%`;
    patients = db.prepare(
      "SELECT * FROM patients WHERE first_name LIKE ? OR last_name LIKE ? OR mrn LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).all(q, q, q, Number(limit), offset);
    total = db.prepare(
      "SELECT COUNT(*) as c FROM patients WHERE first_name LIKE ? OR last_name LIKE ? OR mrn LIKE ?"
    ).get(q, q, q).c;
  } else {
    patients = db.prepare("SELECT * FROM patients ORDER BY created_at DESC LIMIT ? OFFSET ?").all(Number(limit), offset);
    total = db.prepare("SELECT COUNT(*) as c FROM patients").get().c;
  }

  res.json({ patients, total, page: Number(page), limit: Number(limit) });
});

// Get single patient with case count
router.get("/:id", (req, res) => {
  const db = getDb();
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  const caseCount = db.prepare("SELECT COUNT(*) as c FROM cases WHERE patient_id = ?").get(req.params.id).c;
  const cases = db.prepare("SELECT * FROM cases WHERE patient_id = ? ORDER BY created_at DESC").all(req.params.id);

  res.json({ ...patient, case_count: caseCount, cases });
});

// Create patient
router.post("/", requireRole("admin", "doctor", "nurse"), (req, res) => {
  const { mrn, first_name, last_name, dob, sex } = req.body;
  if (!mrn || !first_name || !last_name || !dob) {
    return res.status(400).json({ error: "mrn, first_name, last_name, dob are required" });
  }

  const db = getDb();
  const id = uuid();
  try {
    db.prepare(
      "INSERT INTO patients (id, mrn, first_name, last_name, dob, sex) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, mrn, first_name, last_name, dob, sex || null);
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "MRN already exists" });
    }
    throw err;
  }

  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(id);
  auditLog(req, "patient.create", "patient", id, { mrn, first_name, last_name });
  res.status(201).json(patient);
});

// Update patient
router.put("/:id", requireRole("admin", "doctor", "nurse"), (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Patient not found" });

  const { first_name, last_name, dob, sex } = req.body;
  db.prepare(
    "UPDATE patients SET first_name = ?, last_name = ?, dob = ?, sex = ? WHERE id = ?"
  ).run(
    first_name !== undefined ? first_name : existing.first_name,
    last_name !== undefined ? last_name : existing.last_name,
    dob !== undefined ? dob : existing.dob,
    sex !== undefined ? sex : existing.sex,
    req.params.id
  );

  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.id);
  auditLog(req, "patient.update", "patient", req.params.id, req.body);
  res.json(patient);
});

// Delete patient
router.delete("/:id", requireRole("admin", "doctor", "nurse"), (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Patient not found" });

  const caseCount = db.prepare("SELECT COUNT(*) as c FROM cases WHERE patient_id = ?").get(req.params.id).c;
  if (caseCount > 0) {
    return res.status(409).json({ error: `Cannot delete patient: ${caseCount} case(s) exist. Delete cases first.` });
  }

  db.prepare("DELETE FROM patients WHERE id = ?").run(req.params.id);
  auditLog(req, "patient.delete", "patient", req.params.id, { mrn: existing.mrn });
  res.json({ deleted: true });
});

export default router;
