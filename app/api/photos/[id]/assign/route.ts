import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const formData = await request.formData();
  const albumId = formData.get("album_id");

  const supabase = createServerSupabaseClient(env);
  await supabase
    .from("photos")
    .update({ album_id: typeof albumId === "string" && albumId ? albumId : null })
    .eq("id", id);

  return new Response(null, { status: 302, headers: { Location: "/review" } });
}
