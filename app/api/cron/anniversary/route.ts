import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { buildAlbumDateRanges, type PhotoDateRow } from "@/lib/albumDates";
import { sendPush } from "@/lib/webpush";

/**
 * 앨범 기념일 알림. 매일 한 번(한국시간 오전 9시 = UTC 자정) 호출된다.
 *
 * 앨범의 "첫 날짜"(사진 중 가장 이른 촬영일자, 없으면 업로드 시각)의 월·일이 오늘과 같고
 * 연도가 과거이면 기념일로 본다 — 1년 뒤뿐 아니라 매년 같은 날 다시 걸린다.
 *
 * 이 라우트는 로그인 세션이 아니라 CRON_SECRET 헤더로 보호한다(호출자가 사람이 아니라
 * 스케줄러이므로).
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

  // 한국 시간 기준 '오늘'을 쓴다 — UTC 자정에 돌더라도 사용자가 체감하는 날짜와 맞추기 위함
  const url = new URL(request.url);
  const override = url.searchParams.get("date"); // 테스트용: YYYY-MM-DD 강제 지정
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const today = override ?? nowKst.toISOString().slice(0, 10);
  const [todayYear, todayMonth, todayDay] = today.split("-");

  const [{ data: albums }, { data: photoDates }] = await Promise.all([
    supabase.from("albums").select("id, title").returns<{ id: string; title: string }[]>(),
    supabase
      .from("photos")
      .select("album_id, taken_at, uploaded_at")
      .not("album_id", "is", null)
      .returns<PhotoDateRow[]>(),
  ]);

  const ranges = buildAlbumDateRanges(photoDates ?? []);

  const anniversaries = (albums ?? []).filter((album) => {
    const range = ranges.get(album.id);
    if (!range) return false;
    const [year, month, day] = range.start.split("-");
    return month === todayMonth && day === todayDay && year < todayYear;
  });

  if (anniversaries.length === 0) {
    return Response.json({ today, anniversaries: 0, sent: 0 });
  }

  // 같은 앨범을 하루에 두 번 알리지 않도록, 이미 보낸 건 건너뛴다
  const { data: alreadySent } = await supabase
    .from("notification_log")
    .select("album_id")
    .eq("sent_on", today)
    .returns<{ album_id: string }[]>();
  const sentIds = new Set((alreadySent ?? []).map((r) => r.album_id));
  const pending = anniversaries.filter((a) => !sentIds.has(a.id));

  if (pending.length === 0) {
    return Response.json({ today, anniversaries: anniversaries.length, sent: 0, skipped: "이미 발송함" });
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

  // 만료된 구독은 정리해 다음 발송부터 빠지게 한다
  if (expired.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }

  await supabase
    .from("notification_log")
    .insert(pending.map((a) => ({ album_id: a.id, sent_on: today })));

  return Response.json({
    today,
    anniversaries: pending.map((a) => a.title),
    subscriptions: subscriptions?.length ?? 0,
    sent,
    expired: expired.length,
  });
}
