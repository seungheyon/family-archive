import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";
import { thumbKeyForPhoto } from "@/lib/photoKeys";

// 사진은 한 번 올라가면 바뀌지 않으므로(수정 기능이 없고, 삭제 시엔 URL 자체가 사라진다)
// 길게 캐시해도 안전하다.
const CACHE_CONTROL = "private, max-age=31536000, immutable";

function imageResponse(object: R2ObjectBody) {
  return new Response(object.body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { env, ctx } = await getCloudflareContext({ async: true });

  // 캐시를 보기 전에 반드시 인증부터 확인한다 — 캐시가 인증 게이트를 우회하면 안 된다.
  if (!(await isAuthenticated(env.SESSION_SECRET))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const wantsThumb =
    new URL(request.url).searchParams.get("variant") === "thumb";

  // 같은 사진을 여러 사람이/여러 번 열어도 매번 R2까지 가지 않도록 엣지 캐시를 쓴다.
  // 캐시 키에서 쿼리스트링 노이즈(캐시버스팅 파라미터 등)를 제거해 적중률을 높인다.
  const cacheKey = new Request(
    `https://cache.local/photo/${id}${wantsThumb ? "/thumb" : "/original"}`,
    { method: "GET" },
  );
  // `caches.default`는 Cloudflare Workers 전용 확장이라 표준 CacheStorage 타입에는 없다.
  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let object: R2ObjectBody | null = null;

  if (wantsThumb) {
    // 빠른 경로: 키를 id에서 유도하므로 DB를 거치지 않는다.
    object = await env.PHOTOS_BUCKET.get(thumbKeyForPhoto(id));
  }

  if (!object) {
    // 원본이거나, 아직 예전 방식(무작위 키)으로 저장된 썸네일인 경우
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
    object = await env.PHOTOS_BUCKET.get(key);
  }

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const response = imageResponse(object);
  // 캐시 쓰기를 기다리지 않고 응답을 먼저 돌려준다 — await하면 캐시 미적중인 첫 요청이
  // 캐시 저장이 끝날 때까지 붙잡혀서, 캐시를 붙인 대가를 사용자가 그대로 체감하게 된다.
  // waitUntil로 넘기면 응답을 보낸 뒤 백그라운드에서 저장이 끝난다.
  // (본문은 한 번만 읽을 수 있으므로 복제해서 넣는다.)
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
