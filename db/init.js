import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { hashSync } from "bcryptjs";
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

  const count = db.prepare("SELECT COUNT(*) as c FROM users").get();
  if (count.c === 0) {
    const insert = db.prepare(
      "INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)"
    );

    const users = [
      { username: "admin", name: "System Admin", role: "admin" },
      { username: "dr.jones", name: "Dr. Sarah Jones", role: "doctor" },
      { username: "nurse.lee", name: "Nurse Kevin Lee", role: "nurse" },
      { username: "auditor", name: "Legal Auditor", role: "auditor" },
    ];

    const credentials = [];
    for (const u of users) {
      const pw = generatePassword();
      insert.run(uuid(), u.username, hashSync(pw, 12), u.name, u.role);
      credentials.push(`  ${u.username} / ${pw}`);
    }

    console.log("[db] Seeded users (save these — passwords shown once):");
    console.log(credentials.join("\n"));
  }

  // Ensure test user exists for automated testing
  const testUser = db.prepare("SELECT id FROM users WHERE username = ?").get("test");
  if (!testUser) {
    db.prepare(
      "INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)"
    ).run(uuid(), "test", hashSync("test1234", 12), "Test User", "admin");
  }
}

export function closeDb() {
  if (db) db.close();
}
