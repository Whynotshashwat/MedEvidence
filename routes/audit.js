import { Router } from "express";
import { getDb } from "../db/init.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole("admin", "auditor"));

router.get("/", (req, res) => {
  const db = getDb();
  const { user_id, action, entity_type } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (user_id) { conditions.push("user_id = ?"); params.push(user_id); }
  if (action) { conditions.push("action LIKE ?"); params.push(`%${action}%`); }
  if (entity_type) { conditions.push("entity_type = ?"); params.push(entity_type); }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  const logs = db.prepare(`SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, Number(limit), offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM audit_log ${where}`).get(...params).c;

  res.json({ logs, total, page: Number(page), limit: Number(limit) });
});

router.get("/stats", (req, res) => {
  const db = getDb();
  const byAction = db.prepare("SELECT action, COUNT(*) as count FROM audit_log GROUP BY action ORDER BY count DESC").all();
  const byUser = db.prepare("SELECT username, COUNT(*) as count FROM audit_log GROUP BY username ORDER BY count DESC").all();
  const recent = db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10").all();
  const total = db.prepare("SELECT COUNT(*) as c FROM audit_log").get().c;

  res.json({ total, byAction, byUser, recent });
});

export default router;
