import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SECRET_FILE = join(__dirname, "..", ".jwt-secret");

function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  if (process.env.NODE_ENV === "production") {
    console.error("[FATAL] JWT_SECRET environment variable is required in production");
    process.exit(1);
  }

  // Persist dev secret across restarts
  if (existsSync(SECRET_FILE)) {
    return readFileSync(SECRET_FILE, "utf8").trim();
  }

  const secret = randomBytes(32).toString("hex");
  writeFileSync(SECRET_FILE, secret, "utf8");
  console.log("[auth] Generated and saved dev JWT secret to .jwt-secret");
  return secret;
}

const SECRET = getSecret();
const JWT_EXPIRES = process.env.JWT_EXPIRES || "24h";

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(" or ")}` });
    }
    next();
  };
}
