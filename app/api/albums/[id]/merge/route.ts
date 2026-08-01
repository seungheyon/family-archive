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

  const formData = await request.formData();
  const targetAlbumId = formData.get("target_album_id");
  const validTarget =
    typeof targetAlbumId === "string" && targetAlbumId && targetAlbumId !== id
      ? targetAlbumId
      : null;

  if (validTarget) {
    const supabase = createServerSupabaseClient(env);
    await supabase
      .from("photos")
      .update({ album_id: validTarget })
      .eq("album_id", id);
    await supabase.from("albums").delete().eq("id", id);
  }

  const location = validTarget ? `/albums/${validTarget}?msg=album-merged` : "/";

  return new Response(null, {
    status: 302,
    headers: { Location: location },
  });
}
