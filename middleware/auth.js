import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("[FATAL] JWT_SECRET environment variable is required in production");
    process.exit(1);
  }
  // Dev fallback: generate random secret, warn once
  const devSecret = randomBytes(32).toString("hex");
  console.warn("[WARN] JWT_SECRET not set. Using random dev secret. Tokens will NOT survive restarts.");
  var _JWT_SECRET = devSecret;
}
const SECRET = JWT_SECRET || _JWT_SECRET;
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
