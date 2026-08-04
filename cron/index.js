/**
 * 기념일 알림용 스케줄러.
 *
 * OpenNext가 생성하는 메인 Worker에는 scheduled 핸들러를 얹기 어렵고(빌드마다 재생성됨),
 * 억지로 감싸면 본체 빌드가 깨질 위험이 있어 스케줄러만 별도 Worker로 분리했다.
 * 로직은 전부 본체의 /api/cron/anniversary에 있고, 여기서는 매일 한 번 그걸 호출만 한다.
 */
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(trigger(env));
  },

  // 수동 확인용 — 같은 시크릿을 알아야 호출할 수 있다
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.searchParams.get("secret") !== env.CRON_SECRET) {
      return new Response("Forbidden", { status: 403 });
    }
    const res = await trigger(env, url.searchParams.get("date"));
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  },
};

function trigger(env, date) {
  const target = new URL("/api/cron/anniversary", env.APP_ORIGIN);
  if (date) target.searchParams.set("date", date);
  return fetch(target, {
    method: "POST",
    headers: { "x-cron-secret": env.CRON_SECRET },
  });
}
