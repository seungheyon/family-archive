import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAdmin(env.SESSION_SECRET))) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createServerSupabaseClient(env);
  // photos.album_id는 on delete set null이라, 이 앨범의 사진들은 삭제되지 않고 미분류로 남는다.
  await supabase.from("albums").delete().eq("id", id);

  return new Response(null, {
    status: 302,
    headers: { Location: "/?msg=album-deleted" },
  });
}
