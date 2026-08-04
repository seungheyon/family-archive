import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { getImageDimensions } from "@/lib/imageDimensions";

/**
 * width/height 컬럼 도입(2026-08-04) 이전에 업로드된 사진들은 크기 정보가 없다.
 * 크기를 모르면 라이트박스가 정사각형 폴백값을 쓰게 돼 사진이 눌려 보이므로,
 * R2 원본을 읽어 한 번 채워 넣는다. width가 비어있는 행에만 동작하므로 여러 번
 * 실행해도 안전하다.
 *
 * (썸네일은 브라우저에서 생성하는 구조라 이 라우트에서 만들지 않는다 — 기존 사진은
 *  썸네일 없이 원본으로 폴백해 서빙된다.)
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
    .is("width", null)
    .returns<{ id: string; r2_key: string }[]>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  let failed = 0;

  for (const photo of photos ?? []) {
    const dims = await getImageDimensions(env.PHOTOS_BUCKET, photo.r2_key);
    if (!dims) {
      failed++;
      continue;
    }
    await supabase
      .from("photos")
      .update({ width: dims.width, height: dims.height })
      .eq("id", photo.id);
    updated++;
  }

  return Response.json({ updated, failed, total: photos?.length ?? 0 });
}
