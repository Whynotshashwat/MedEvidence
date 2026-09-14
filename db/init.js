import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import bcryptjs from "bcryptjs";
const { hashSync } = bcryptjs;
import { v4 as uuid } from "uuid";
import { randomBytes } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, "medevidence.db");

let db;

function generatePassword(len = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  const bytes = randomBytes(len);
  let pw = "";
  for (let i = 0; i < len; i++) pw += chars[bytes.readUInt8(i) % chars.length];
  return pw;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, full_name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','superadmin','doctor','nurse','auditor')), created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, mrn TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL, last_name TEXT NOT NULL, dob TEXT NOT NULL, sex TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id), case_number TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','escalated','resolved','closed')), created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS vitals (id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), heart_rate INTEGER NOT NULL, resp_rate INTEGER NOT NULL, temp REAL NOT NULL, systolic_bp INTEGER NOT NULL, recorded_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS recommendations (id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), score INTEGER NOT NULL, recommend TEXT NOT NULL, model_version TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), record_id TEXT NOT NULL, execution_id TEXT, digest TEXT, evidence_json TEXT, binding_hash TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, username TEXT, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, details TEXT, ip TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS tamper_backup (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, vitals_json TEXT NOT NULL, rec_json TEXT NOT NULL, backed_up_at TEXT DEFAULT (datetime('now')));
`;

export function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(SCHEMA);

    const count = db.prepare("SELECT COUNT(*) as c FROM users").get();
    if (count.c === 0) {
      const insert = db.prepare(
        "INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)"
      );
    const users = [
      { username: "admin", name: "System Admin", role: "admin", pw: "admin123" },
      { username: "dr.jones", name: "Dr. Sarah Jones", role: "doctor", pw: "doc123" },
      { username: "nurse.lee", name: "Nurse Kevin Lee", role: "nurse", pw: "nurse123" },
      { username: "auditor", name: "Legal Auditor", role: "auditor", pw: "audit123" },
    ];
    for (const u of users) {
      insert.run(uuid(), u.username, hashSync(u.pw, 12), u.name, u.role);
    }

    const superAdmin = db.prepare("SELECT id FROM users WHERE username = ?").get("superadmin");
    if (!superAdmin) {
      db.prepare(
        "INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)"
      ).run(uuid(), "superadmin", hashSync("shashwat", 12), "Super Admin", "superadmin");
    }
    }

    const testUser = db.prepare("SELECT id FROM users WHERE username = ?").get("test");
    if (!testUser) {
      db.prepare(
        "INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)"
      ).run(uuid(), "test", hashSync("test1234", 12), "Test User", "admin");
    }
  }
  return db;
}

export function closeDb() {
  if (db) db.close();
}
