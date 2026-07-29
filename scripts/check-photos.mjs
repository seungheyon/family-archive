import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDevVar(name) {
  const content = readFileSync(join(__dirname, "..", ".dev.vars"), "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    if (key === name) return trimmed.slice(idx + 1).trim();
  }
  throw new Error(`${name} not found in .dev.vars`);
}

async function main() {
  const client = new Client({
    connectionString: loadDevVar("DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const res = await client.query(
    "select id, r2_key, original_filename, taken_at, gps_lat, gps_lng, uploaded_at from photos order by uploaded_at desc limit 10",
  );
  console.log(`photos 테이블 행 수(최근 10개): ${res.rows.length}`);
  console.table(res.rows);
  await client.end();
}

main().catch((err) => {
  console.error("조회 실패:", err.message);
  process.exit(1);
});
