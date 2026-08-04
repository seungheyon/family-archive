import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";

/** 이 기기를 알림 대상으로 등록 */
export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAuthenticated(env.SESSION_SECRET))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: string; p256dh?: string; auth?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  if (!body.endpoint || !body.p256dh || !body.auth) {
    return Response.json({ error: "구독 정보가 올바르지 않아요." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient(env);
  // 같은 기기가 다시 구독하면 갱신되도록 endpoint를 기준으로 upsert한다
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { endpoint: body.endpoint, p256dh: body.p256dh, auth: body.auth },
      { onConflict: "endpoint" },
    );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

/** 알림 끄기 */
export async function DELETE(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAuthenticated(env.SESSION_SECRET))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  if (!body.endpoint) {
    return Response.json({ error: "구독 정보가 없어요." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient(env);
  await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint);

  return Response.json({ ok: true });
}
