import { getDb } from "../db/init.js";

export function auditLog(req, action, entityType, entityId, details) {
  try {
    const db = getDb();
    db.prepare(
      "INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      req.user?.id || null,
      req.user?.username || "system",
      action,
      entityType,
      entityId || null,
      details ? JSON.stringify(details) : null,
      req.ip || req.connection?.remoteAddress || null
    );
  } catch (err) {
    console.error("[audit] write failed:", err.message);
  }
}
