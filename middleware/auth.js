import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.JWT_SECRET) {
  console.error("[FATAL] JWT_SECRET environment variable is required in production");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || "medevidence-dev-secret-change-in-prod";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "24h";

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
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
