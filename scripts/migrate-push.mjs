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
    if (trimmed.slice(0, idx).trim() === name) return trimmed.slice(idx + 1).trim();
  }
  throw new Error(`${name} not found in .dev.vars`);
}

// db.<ref>.supabase.co는 IPv6 전용이라 이 네트워크에서 막힌다 — IPv4로 해석되는 풀러를 쓴다
// (자세한 경위는 scripts/migrate-dimensions.mjs 주석 참고).
function poolerConfig() {
  const direct = new URL(loadDevVar("DATABASE_URL"));
  const ref = direct.hostname.split(".")[1];
  return {
    host: "aws-0-ap-northeast-1.pooler.supabase.com",
    port: 5432,
    user: `postgres.${ref}`,
    password: decodeURIComponent(direct.password),
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

const ddl = `
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);

-- 같은 앨범 기념일 알림을 하루에 두 번 보내지 않도록 발송 이력을 남긴다
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  album_id uuid,
  sent_on date not null,
  created_at timestamptz not null default now(),
  unique (album_id, sent_on)
);
`;

async function main() {
  const client = new Client(poolerConfig());
  await client.connect();
  await client.query(ddl);
  const { rows } = await client.query(
    `select table_name from information_schema.tables
     where table_schema='public' and table_name in ('push_subscriptions','notification_log')`,
  );
  console.log("Migration complete. tables:", rows.map((r) => r.table_name).join(", "));
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
