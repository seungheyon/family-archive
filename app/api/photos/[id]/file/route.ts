import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAuthenticated(env.SESSION_SECRET))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const wantsThumb =
    new URL(request.url).searchParams.get("variant") === "thumb";

  const supabase = createServerSupabaseClient(env);
  const { data: photo, error } = await supabase
    .from("photos")
    .select("r2_key, thumb_key")
    .eq("id", id)
    .single();

  if (error || !photo) {
    return new Response("Not found", { status: 404 });
  }

  // 썸네일을 요청했는데 아직 없는 사진(썸네일 도입 이전 업로드분)은 원본으로 폴백한다.
  const key = wantsThumb && photo.thumb_key ? photo.thumb_key : photo.r2_key;

  const object = await env.PHOTOS_BUCKET.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      // 사진 원본/썸네일은 한 번 올라가면 바뀌지 않으므로 길게 캐시해도 안전하다
      // (수정 기능이 없고, 삭제 시에는 URL 자체가 사라진다).
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
