import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin, isAuthenticated } from "@/lib/auth";
import { DUPLICATE_TITLE_MESSAGE, findDuplicateAlbumTitle } from "@/lib/albumTitle";

/**
 * 여러 장을 한 번에 삭제/이동한다.
 *
 * 기존에는 사진 한 장마다 `/api/photos/[id]/delete`를 호출했는데, 그 라우트는 302
 * 리다이렉트를 돌려주고 브라우저 `fetch`가 그걸 자동으로 따라가면서 앨범 페이지가
 * 사진 수만큼 통째로 다시 렌더링됐다(1회당 1.4~3.9초). 여기서는 JSON만 돌려주고
 * DB/R2 작업도 한 번에 묶어 그 낭비를 없앤다.
 */
export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAuthenticated(env.SESSION_SECRET))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: string;
    ids?: string[];
    albumId?: string | null;
    title?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((v) => typeof v === "string") : [];
  if (ids.length === 0) {
    return Response.json({ error: "대상 사진이 없어요." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient(env);

  // 미분류 사진을 고른 자리에서 바로 앨범을 만들어 묶는다 — 앨범을 먼저 만들고 목록으로
  // 돌아와 다시 고르는 왕복을 없애기 위함.
  if (body.action === "move-to-new-album") {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return Response.json({ error: "앨범 이름을 입력해 주세요." }, { status: 400 });
    }
    if (await findDuplicateAlbumTitle(supabase, title)) {
      return Response.json({ error: DUPLICATE_TITLE_MESSAGE }, { status: 409 });
    }

    const { data: album, error: createError } = await supabase
      .from("albums")
      .insert({ title })
      .select("id")
      .single();

    if (createError || !album) {
      return Response.json(
        { error: createError?.message ?? "앨범을 만들지 못했어요." },
        { status: 500 },
      );
    }

    const { error } = await supabase
      .from("photos")
      .update({ album_id: album.id })
      .in("id", ids);
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true, albumId: album.id, moved: ids.length });
  }

  if (body.action === "move") {
    const albumId = typeof body.albumId === "string" && body.albumId ? body.albumId : null;
    const { error } = await supabase
      .from("photos")
      .update({ album_id: albumId })
      .in("id", ids);
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true, moved: ids.length });
  }

  if (body.action === "delete") {
    // 삭제는 되돌릴 수 없는 유일한 동작이라 기존 방침대로 관리자 전용을 유지한다.
    if (!(await isAdmin(env.SESSION_SECRET))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: rows, error: selectError } = await supabase
      .from("photos")
      .select("r2_key, thumb_key")
      .in("id", ids)
      .returns<{ r2_key: string; thumb_key: string | null }[]>();

    if (selectError) {
      return Response.json({ error: selectError.message }, { status: 500 });
    }

    const keys = (rows ?? []).flatMap((r) =>
      r.thumb_key ? [r.r2_key, r.thumb_key] : [r.r2_key],
    );

    const [, deleteResult] = await Promise.all([
      Promise.all(keys.map((k) => env.PHOTOS_BUCKET.delete(k))),
      supabase.from("photos").delete().in("id", ids),
    ]);

    if (deleteResult.error) {
      return Response.json({ error: deleteResult.error.message }, { status: 500 });
    }
    return Response.json({ ok: true, deleted: ids.length });
  }

  return Response.json({ error: "알 수 없는 동작이에요." }, { status: 400 });
}
