import express from "express";
import helmet from "helmet";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getDb, closeDb } from "./db/init.js";
import { requireAuth } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

getDb();

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const isProduction = process.env.NODE_ENV === "production";
app.use(cors(isProduction ? { origin: process.env.ALLOWED_ORIGIN || false } : { origin: "http://localhost:3000" }));
app.use(express.json({ limit: "1mb" }));

// Global rate limiting
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: "Too many requests" }));

// Request logging
app.use((req, _res, next) => {
  if (req.path !== "/api/health") {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  }
  next();
});

// Static files
app.use(express.static(join(__dirname, "public")));

// API routes
import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import caseRoutes from "./routes/cases.js";
import auditRoutes from "./routes/audit.js";

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/audit", auditRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Dashboard stats
app.get("/api/dashboard", requireAuth, (req, res) => {
  const db = getDb();
  const totalPatients = db.prepare("SELECT COUNT(*) as c FROM patients").get().c;
  const totalCases = db.prepare("SELECT COUNT(*) as c FROM cases").get().c;
  const openCases = db.prepare("SELECT COUNT(*) as c FROM cases WHERE status = 'open'").get().c;
  const escalatedCases = db.prepare("SELECT COUNT(*) as c FROM cases WHERE status = 'escalated'").get().c;
  const resolvedCases = db.prepare("SELECT COUNT(*) as c FROM cases WHERE status IN ('resolved','closed')").get().c;
  const totalEvidence = db.prepare("SELECT COUNT(*) as c FROM evidence").get().c;

  const recentCases = db.prepare(`
    SELECT c.*, p.first_name, p.last_name, p.mrn,
           r.score, r.recommend
    FROM cases c
    LEFT JOIN patients p ON c.patient_id = p.id
    LEFT JOIN recommendations r ON r.case_id = c.id
      AND r.created_at = (SELECT MAX(r2.created_at) FROM recommendations r2 WHERE r2.case_id = c.id)
    ORDER BY c.created_at DESC LIMIT 5
  `).all();

  const recentAudit = db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10").all();

  res.json({
    stats: { totalPatients, totalCases, openCases, escalatedCases, resolvedCases, totalEvidence },
    recentCases,
    recentAudit,
  });
});

// SPA fallback
app.get("/{*splat}", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(join(__dirname, "public", "index.html"));
});

// Error handler — never leak internal details
app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\nMedEvidence v2 — http://localhost:${PORT}`);
  console.log("  Users seeded on first run. Check server logs for credentials.\n");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log("\nShutting down...");
    closeDb();
    server.close(() => process.exit(0));
  });
}
