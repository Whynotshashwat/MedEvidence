import { Router } from "express";
import { compareSync, hashSync } from "bcryptjs";
import { v4 as uuid } from "uuid";
import { getDb } from "../db/init.js";
import { signToken, verifyToken, requireAuth, requireRole } from "../middleware/auth.js";
import { auditLog } from "../middleware/audit.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts, try again later" });

router.post("/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !compareSync(password, user.password_hash)) {
    auditLog(req, "login.failed", "user", null, { username });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  auditLog(req, "login.success", "user", user.id, { username: user.username, role: user.role });

  res.json({
    token,
    user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
  });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get("/users", requireAuth, (req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at").all();
  res.json(users);
});

function generatePassword(len = 12) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;
  let pw = "";
  pw += upper[Math.floor(Math.random() * upper.length)];
  pw += lower[Math.floor(Math.random() * lower.length)];
  pw += digits[Math.floor(Math.random() * digits.length)];
  pw += special[Math.floor(Math.random() * special.length)];
  for (let i = pw.length; i < len; i++) pw += all[Math.floor(Math.random() * all.length)];
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

router.post("/users", requireAuth, requireRole("admin"), (req, res) => {
  const { username, full_name, role, password } = req.body;
  if (!username || !full_name || !role) {
    return res.status(400).json({ error: "username, full_name, and role are required" });
  }
  if (!["admin", "doctor", "nurse", "auditor"].includes(role)) {
    return res.status(400).json({ error: "role must be admin, doctor, nurse, or auditor" });
  }

  const generatedPassword = password || generatePassword();
  const id = uuid();
  const db = getDb();

  try {
    db.prepare(
      "INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)"
    ).run(id, username, hashSync(generatedPassword, 10), full_name, role);
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Username already exists" });
    }
    throw err;
  }

  const user = db.prepare("SELECT id, username, full_name, role, created_at FROM users WHERE id = ?").get(id);
  auditLog(req, "user.create", "user", id, { username, full_name, role });

  res.status(201).json({ user, password: generatedPassword });
});

router.delete("/users/:id", requireAuth, requireRole("admin"), (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.id === req.user.id) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  auditLog(req, "user.delete", "user", req.params.id, { username: user.username });

  res.json({ deleted: true });
});

export default router;
