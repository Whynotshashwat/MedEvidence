import { Router } from "express";
import bcryptjs from "bcryptjs";
const { compareSync, hashSync } = bcryptjs;
import { v4 as uuid } from "uuid";
import { randomBytes } from "crypto";
import { getDb } from "../db/init.js";
import { signToken, verifyToken, requireAuth, requireRole } from "../middleware/auth.js";
import { auditLog } from "../middleware/audit.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

const loginLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 60, message: "Too many login attempts, try again later" });

const VALID_ROLES = ["admin", "doctor", "nurse", "auditor"];
const MAX_USERNAME = 50;
const MAX_NAME = 100;

function generatePassword(len = 16) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const pool = upper + lower + digits + special;
  const bytes = randomBytes(len);
  let pw = "";
  // Guarantee at least one from each category
  pw += upper[bytes.readUInt8(0) % upper.length];
  pw += lower[bytes.readUInt8(1) % lower.length];
  pw += digits[bytes.readUInt8(2) % digits.length];
  pw += special[bytes.readUInt8(3) % special.length];
  for (let i = 4; i < len; i++) pw += pool[bytes.readUInt8(i) % pool.length];
  // Shuffle using Fisher-Yates with crypto randomness
  const arr = pw.split("");
  const shuffleBytes = randomBytes(arr.length);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = shuffleBytes.readUInt8(i) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

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

  // Check if user was deleted (token revocation)
  const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(user.id);
  if (!exists) {
    return res.status(401).json({ error: "Account no longer exists" });
  }

  const token = signToken(user);
  auditLog(req, "login.success", "user", user.id, { username: user.username, role: user.role });

  res.json({
    token,
    user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
  });
});

router.get("/me", requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT id, username, full_name, role, created_at FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(401).json({ error: "User not found" });
  res.json({ user });
});

router.get("/users", requireAuth, requireRole("admin", "superadmin"), (req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT id, username, full_name, role, created_at FROM users WHERE username != 'superadmin' ORDER BY created_at").all();
  res.json(users);
});

router.post("/users", requireAuth, requireRole("admin", "superadmin"), (req, res) => {
  const { username, full_name, role, password } = req.body;

  if (!username || !full_name || !role) {
    return res.status(400).json({ error: "username, full_name, and role are required" });
  }
  if (typeof username !== "string" || username.length > MAX_USERNAME || !/^[a-zA-Z0-9._-]+$/.test(username)) {
    return res.status(400).json({ error: `username must be alphanumeric, max ${MAX_USERNAME} chars` });
  }
  if (typeof full_name !== "string" || full_name.length > MAX_NAME) {
    return res.status(400).json({ error: `full_name must be a string, max ${MAX_NAME} chars` });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
  }

  const generatedPassword = password && typeof password === "string" && password.length >= 8
    ? password
    : generatePassword();
  const id = uuid();
  const db = getDb();

  try {
    db.prepare(
      "INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)"
    ).run(id, username, hashSync(generatedPassword, 12), full_name, role);
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Username already exists" });
    }
    console.error("[user.create]", err);
    return res.status(500).json({ error: "Failed to create user" });
  }

  const user = db.prepare("SELECT id, username, full_name, role, created_at FROM users WHERE id = ?").get(id);
  auditLog(req, "user.create", "user", id, { username, full_name, role });

  res.status(201).json({ user, password: generatedPassword });
});

router.delete("/users/:id", requireAuth, requireRole("admin", "superadmin"), (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.username === "superadmin") {
    return res.status(403).json({ error: "Cannot delete the super admin account" });
  }

  if (user.id === req.user.id) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  auditLog(req, "user.delete", "user", req.params.id, { username: user.username });

  res.json({ deleted: true });
});

export default router;
