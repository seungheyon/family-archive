import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

/**
 * 썸네일 도입(2026-08-04) 이전에 올라온 사진들을 위한 1회성 보정 창구.
 *
 * 썸네일은 브라우저에서 만드는 구조라(Worker에 리사이즈용 WASM을 넣으면 번들 용량
 * 제한 위험) 서버가 스스로 채울 수 없다. 대신 관리자 화면이 원본을 내려받아 썸네일을
 * 만들어 여기로 올려주면 R2에 저장하고 thumb_key를 채운다.
 */

/** 아직 썸네일이 없는 사진 id 목록 */
export async function GET() {
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAdmin(env.SESSION_SECRET))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerSupabaseClient(env);
  const { data, error } = await supabase
    .from("photos")
    .select("id")
    .is("thumb_key", null)
    .returns<{ id: string }[]>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ids: (data ?? []).map((r) => r.id) });
}

/** 브라우저가 만든 썸네일 한 장을 받아 저장 */
export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAdmin(env.SESSION_SECRET))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const id = formData.get("id");
  const thumb = formData.get("thumb");

  if (typeof id !== "string" || !(thumb instanceof File)) {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient(env);
  const { data: photo } = await supabase
    .from("photos")
    .select("id")
    .eq("id", id)
    .single();

  if (!photo) {
    return Response.json({ error: "사진을 찾을 수 없어요." }, { status: 404 });
  }

  const thumbKey = `thumbs/${crypto.randomUUID()}.jpg`;
  await env.PHOTOS_BUCKET.put(thumbKey, await thumb.arrayBuffer(), {
    httpMetadata: { contentType: "image/jpeg" },
  });

  const { error } = await supabase
    .from("photos")
    .update({ thumb_key: thumbKey })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
