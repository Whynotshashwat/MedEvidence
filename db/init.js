import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { hashSync } from "bcryptjs";
import { v4 as uuid } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, "medevidence.db");

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    init();
  }
  return db;
}

function init() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);

  // Seed default admin if no users exist
  const count = db.prepare("SELECT COUNT(*) as c FROM users").get();
  if (count.c === 0) {
    const insert = db.prepare(
      "INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)"
    );
    insert.run(uuid(), "admin", hashSync("admin123", 10), "System Admin", "admin");
    insert.run(uuid(), "dr.jones", hashSync("doc123", 10), "Dr. Sarah Jones", "doctor");
    insert.run(uuid(), "nurse.lee", hashSync("nurse123", 10), "Nurse Kevin Lee", "nurse");
    insert.run(uuid(), "auditor", hashSync("audit123", 10), "Legal Auditor", "auditor");
    console.log("[db] Seeded default users: admin/admin123, dr.jones/doc123, nurse.lee/nurse123, auditor/audit123");
  }
}

export function closeDb() {
  if (db) db.close();
}
