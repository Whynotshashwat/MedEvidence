import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In Vercel, __dirname is /api. Project root is one level up.
process.chdir(join(__dirname, ".."));

const { default: app } = await import("../server.js");

export default function handler(req, res) {
  return app(req, res);
}
