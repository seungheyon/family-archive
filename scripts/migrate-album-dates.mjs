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

/** `db.<ref>.supabase.co`는 AAAA(IPv6)만 있어 IPv4 풀러로 붙는다(사용자명 형태가 다름) */
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

/**
 * 앨범 기간을 사람이 직접 지정할 수 있게 하는 컬럼 두 개.
 *
 * `date_start`/`date_end`는 이미 있지만 자동분류가 채운 값이라 신뢰하지 않고 무시해 왔다
 * (lib/albumDates.ts 주석 참고). 이제 사람이 직접 넣은 값만 신뢰하기 위해 그 구분이 필요하다.
 *
 * - dates_manual: 사람이 직접 지정했는지. false면 지금까지처럼 사진에서 계산한다.
 * - date_precision: 'day' | 'month'. 날짜가 확실치 않아 월까지만 고른 경우를 위한 것으로,
 *   월 단위여도 date_start/date_end에는 그 달의 1일과 말일을 채워 정렬·기념일 판정이
 *   계속 날짜로 동작하게 한다. 화면 표시에서만 이 값을 보고 "2025.05"로 줄인다.
 */
const ddl = `
alter table albums add column if not exists dates_manual boolean not null default false;
alter table albums add column if not exists date_precision text not null default 'day';
`;

async function main() {
  const client = new Client(poolerConfig());
  await client.connect();
  await client.query(ddl);
  const { rows } = await client.query(
    `select column_name, data_type from information_schema.columns
     where table_name = 'albums' order by ordinal_position`,
  );
  console.log("Migration complete. albums columns:");
  for (const r of rows) console.log(`  ${r.column_name} (${r.data_type})`);
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
