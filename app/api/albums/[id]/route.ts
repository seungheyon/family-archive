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
  const title = formData.get("title");

  if (typeof title === "string" && title.trim()) {
    const supabase = createServerSupabaseClient(env);
    await supabase.from("albums").update({ title: title.trim() }).eq("id", id);
  }

  return new Response(null, {
    status: 302,
    headers: { Location: `/albums/${id}?msg=renamed` },
  });
}
