import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { sendPush } from "@/lib/webpush";

/**
 * 예약된 알림을 발송한다. 기념일 알림(/api/cron/anniversary)과 달리 "지정한 시각에 한 번"
 * 보내는 용도라, 스케줄러가 몇 분 간격으로 자주 호출해 발송 시각이 지난 예약을 집어간다.
 *
 * 나중에 "앨범별 전송 주기 설정" 기능을 붙일 때도 이 경로를 그대로 쓰면 된다 —
 * 주기 계산 결과를 scheduled_notifications에 넣어두기만 하면 발송은 여기서 처리된다.
 */
export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  const secret = env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const vapid = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  };
  if (!vapid.publicKey || !vapid.privateKey || !vapid.subject) {
    return Response.json({ error: "VAPID 설정이 없어요." }, { status: 500 });
  }

  const supabase = createServerSupabaseClient(env);
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("scheduled_notifications")
    .select("id, album_id, note")
    .is("sent_at", null)
    .lte("send_at", nowIso)
    .returns<{ id: string; album_id: string | null; note: string | null }[]>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return Response.json({ now: nowIso, due: 0, sent: 0 });
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint")
    .returns<{ endpoint: string }[]>();

  let sent = 0;
  const expired: string[] = [];

  for (const subscription of subscriptions ?? []) {
    try {
      const result = await sendPush(subscription, vapid);
      if (result.gone) expired.push(result.endpoint);
      else if (result.status >= 200 && result.status < 300) sent++;
    } catch {
      // 한 기기가 실패해도 나머지는 계속 보낸다
    }
  }

  if (expired.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }

  // 보낸 예약은 표시해 다음 호출에서 다시 잡히지 않게 한다
  await supabase
    .from("scheduled_notifications")
    .update({ sent_at: nowIso })
    .in(
      "id",
      due.map((d) => d.id),
    );

  return Response.json({
    now: nowIso,
    due: due.length,
    notes: due.map((d) => d.note),
    subscriptions: subscriptions?.length ?? 0,
    sent,
    expired: expired.length,
  });
}
