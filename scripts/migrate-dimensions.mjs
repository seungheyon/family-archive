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

/**
 * `.dev.vars`의 DATABASE_URL은 `db.<ref>.supabase.co`를 가리키는데, 이 호스트는 A 레코드
 * 없이 AAAA(IPv6)만 있어서 IPv6 경로가 없는 네트워크에서는 ENOTFOUND로 연결이 실패한다.
 * Supabase 커넥션 풀러는 IPv4로 해석되므로, 같은 자격증명으로 풀러에 붙는다.
 * (사용자명이 `postgres.<ref>` 형태로 달라지는 점에 주의)
 */
function poolerConfig() {
  const direct = new URL(loadDevVar("DATABASE_URL"));
  const ref = direct.hostname.split(".")[1];
  return {
    host: `aws-0-${loadPoolerRegion()}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${ref}`,
    password: decodeURIComponent(direct.password),
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

function loadPoolerRegion() {
  try {
    return loadDevVar("SUPABASE_POOLER_REGION");
  } catch {
    return "ap-northeast-1";
  }
}

const ddl = `
alter table photos add column if not exists width int;
alter table photos add column if not exists height int;
alter table photos add column if not exists thumb_key text;
`;

async function main() {
  const client = new Client(poolerConfig());
  await client.connect();
  await client.query(ddl);
  const { rows } = await client.query(
    `select column_name from information_schema.columns
     where table_name = 'photos' order by ordinal_position`,
  );
  console.log("Migration complete. photos columns:");
  console.log("  " + rows.map((r) => r.column_name).join(", "));
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
