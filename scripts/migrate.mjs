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
create extension if not exists pgcrypto;

create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date_start date,
  date_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references albums(id) on delete set null,
  r2_key text not null unique,
  original_filename text,
  taken_at timestamptz,
  gps_lat double precision,
  gps_lng double precision,
  uploaded_at timestamptz not null default now()
);

create index if not exists photos_album_id_idx on photos(album_id);
create index if not exists photos_taken_at_idx on photos(taken_at);
`;

async function main() {
  const client = new Client({
    connectionString: loadDevVar("DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(ddl);
  console.log("Migration complete: albums, photos tables ready.");
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
