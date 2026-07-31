import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { sha256Hex } from "@/lib/hash";

/**
 * content_hash 컬럼 도입(2026-07-29) 이전에 업로드된 사진들은 해시가 없어
 * 중복 업로드 감지 대상에서 빠진다. R2 원본을 다시 읽어 해시를 채워 넣는
 * 1회성 보정 라우트 — content_hash가 비어있는 행에만 동작하므로 몇 번을
 * 실행해도 안전하다.
 */
export async function POST() {
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAdmin(env.SESSION_SECRET))) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createServerSupabaseClient(env);
  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, r2_key")
    .is("content_hash", null);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  let missing = 0;

  for (const photo of photos ?? []) {
    const object = await env.PHOTOS_BUCKET.get(photo.r2_key);
    if (!object) {
      missing++;
      continue;
    }
    const buffer = await object.arrayBuffer();
    const contentHash = await sha256Hex(buffer);
    await supabase.from("photos").update({ content_hash: contentHash }).eq("id", photo.id);
    updated++;
  }

  return Response.json({ updated, missing });
}
