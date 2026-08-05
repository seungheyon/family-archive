import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDevVar(name) {
  const content = readFileSync(join(__dirname, "..", ".dev.vars"), "utf-8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    if (t.slice(0, i).trim() === name) return t.slice(i + 1).trim();
  }
  throw new Error(`${name} not found in .dev.vars`);
}

// IPv6 전용 직접 호스트 대신 IPv4로 해석되는 풀러를 쓴다(migrate-dimensions.mjs 주석 참고)
function poolerConfig() {
  const direct = new URL(loadDevVar("DATABASE_URL"));
  return {
    host: "aws-0-ap-northeast-1.pooler.supabase.com",
    port: 5432,
    user: `postgres.${direct.hostname.split(".")[1]}`,
    password: decodeURIComponent(direct.password),
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

// 특정 앨범 알림을 원하는 시각에 한 번 보내기 위한 예약 테이블.
// 지금은 1회성 예약만 쓰지만, 나중에 "앨범별 전송 주기" 기능의 토대로 쓸 수 있다.
const ddl = `
create table if not exists scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references albums(id) on delete cascade,
  send_at timestamptz not null,
  sent_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists scheduled_notifications_pending_idx
  on scheduled_notifications (send_at) where sent_at is null;
`;

const client = new Client(poolerConfig());
await client.connect();
await client.query(ddl);
console.log("Migration complete: scheduled_notifications ready.");
await client.end();
