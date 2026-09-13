import { Router } from "express";
import { compareSync } from "bcryptjs";
import { getDb } from "../db/init.js";
import { signToken, verifyToken, requireAuth } from "../middleware/auth.js";
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

export default router;
