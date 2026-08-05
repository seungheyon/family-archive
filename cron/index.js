/**
 * 알림 스케줄러.
 *
 * OpenNext가 생성하는 메인 Worker에는 scheduled 핸들러를 얹기 어렵고(빌드마다 재생성됨),
 * 억지로 감싸면 본체 빌드가 깨질 위험이 있어 스케줄러만 별도 Worker로 분리했다.
 * 로직은 전부 본체 API에 있고, 여기서는 정해진 시각에 그걸 호출만 한다.
 *
 * 두 가지 일을 한다:
 * - 하루 한 번(UTC 자정 = 한국시간 오전 9시): 앨범 기념일 알림
 * - 5분마다: 예약된 알림(지정한 시각에 한 번 보내는 건) 확인
 */
const ANNIVERSARY_CRON = "0 0 * * *";

export default {
  async scheduled(event, env, ctx) {
    const path =
      event.cron === ANNIVERSARY_CRON
        ? "/api/cron/anniversary"
        : "/api/cron/scheduled";
    ctx.waitUntil(call(env, path));
  },

  // 수동 확인용 — 같은 시크릿을 알아야 호출할 수 있다
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.searchParams.get("secret") !== env.CRON_SECRET) {
      return new Response("Forbidden", { status: 403 });
    }
    const path =
      url.searchParams.get("job") === "scheduled"
        ? "/api/cron/scheduled"
        : "/api/cron/anniversary";
    const res = await call(env, path, url.searchParams.get("date"));
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  },
};

function call(env, path, date) {
  const target = new URL(path, env.APP_ORIGIN);
  if (date) target.searchParams.set("date", date);
  return fetch(target, {
    method: "POST",
    headers: { "x-cron-secret": env.CRON_SECRET },
  });
}
