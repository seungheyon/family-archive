import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";
import { findDuplicateAlbumTitle } from "@/lib/albumTitle";
import { monthToRangeEdges } from "@/lib/albumDates";

/**
 * 책장에서 표지를 길게 눌러 여는 편집 폼의 저장 엔드포인트.
 *
 * 기존 `/api/albums/[id]`는 저장 후 앨범 상세로 302 리다이렉트하는데, 여기서는 책장에
 * 머문 채 값만 갱신하면 되므로 JSON만 돌려준다(브라우저 `fetch`가 302를 자동 추종해
 * 페이지 전체가 다시 렌더링되던 문제를 여기서 반복하지 않기 위함).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAuthenticated(env.SESSION_SECRET))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    precision?: "day" | "month";
    start?: string;
    end?: string;
  };

  const title = (body.title ?? "").trim();
  if (!title) {
    return Response.json({ error: "title-required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient(env);
  if (await findDuplicateAlbumTitle(supabase, title, id)) {
    return Response.json({ error: "duplicate" }, { status: 409 });
  }

  const update: Record<string, unknown> = { title };

  const start = (body.start ?? "").trim();
  const end = (body.end ?? "").trim();

  if (!start && !end) {
    // 둘 다 비우면 수동 지정을 해제하고 사진에서 계산하는 원래 동작으로 되돌린다
    update.dates_manual = false;
    update.date_start = null;
    update.date_end = null;
    update.date_precision = "day";
  } else if (start && end) {
    const precision = body.precision === "month" ? "month" : "day";
    // 월까지만 고른 경우에도 저장은 날짜로 한다 — 정렬과 기념일 판정이 계속 날짜로 동작해야 하고,
    // 화면에서 "2025.05"로 줄이는 것은 date_precision을 보고 표시 단계에서만 한다.
    const from = precision === "month" ? monthToRangeEdges(start).start : start;
    const to = precision === "month" ? monthToRangeEdges(end).end : end;

    if (from > to) {
      return Response.json({ error: "range-reversed" }, { status: 400 });
    }

    update.dates_manual = true;
    update.date_start = from;
    update.date_end = to;
    update.date_precision = precision;
  } else {
    return Response.json({ error: "range-incomplete" }, { status: 400 });
  }

  const { error } = await supabase.from("albums").update(update).eq("id", id);
  if (error) {
    return Response.json({ error: "update-failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
