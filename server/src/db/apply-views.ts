import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const viewsSql = readFileSync(path.join(__dirname, "views.sql"), "utf-8");
  await sql.unsafe(viewsSql);
  console.log("Vues appliquées.");
  await sql.end();
}

main();
