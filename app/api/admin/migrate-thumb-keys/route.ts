import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { thumbKeyForPhoto } from "@/lib/photoKeys";

/**
 * 무작위 이름으로 저장돼 있던 기존 썸네일을 id 기반 고정 키로 옮긴다(lib/photoKeys 참고).
 * 옮겨야 이미지 요청이 DB를 거치지 않는 빠른 경로를 탈 수 있다.
 *
 * 이미 올바른 키인 사진은 건너뛰므로 여러 번 실행해도 안전하다.
 */
export async function POST() {
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAdmin(env.SESSION_SECRET))) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createServerSupabaseClient(env);
  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, thumb_key")
    .not("thumb_key", "is", null)
    .returns<{ id: string; thumb_key: string }[]>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let moved = 0;
  let skipped = 0;
  let failed = 0;

  for (const photo of photos ?? []) {
    const target = thumbKeyForPhoto(photo.id);
    if (photo.thumb_key === target) {
      skipped++;
      continue;
    }

    const existing = await env.PHOTOS_BUCKET.get(photo.thumb_key);
    if (!existing) {
      failed++;
      continue;
    }

    await env.PHOTOS_BUCKET.put(target, await existing.arrayBuffer(), {
      httpMetadata: { contentType: "image/jpeg" },
    });
    await supabase
      .from("photos")
      .update({ thumb_key: target })
      .eq("id", photo.id);
    await env.PHOTOS_BUCKET.delete(photo.thumb_key);
    moved++;
  }

  return Response.json({ moved, skipped, failed });
}
