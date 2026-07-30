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

const ddl = `
alter table photos add column if not exists content_hash text;
create index if not exists photos_content_hash_idx on photos(content_hash);
`;

async function main() {
  const client = new Client({
    connectionString: loadDevVar("DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(ddl);
  console.log("Migration complete: photos.content_hash column ready.");
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
