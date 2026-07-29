import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAuthenticated(env.SESSION_SECRET))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const albumId = formData.get("album_id");

  const supabase = createServerSupabaseClient(env);
  await supabase
    .from("photos")
    .update({ album_id: typeof albumId === "string" && albumId ? albumId : null })
    .eq("id", id);

  return new Response(null, {
    status: 302,
    headers: { Location: "/review?msg=assigned" },
  });
}
