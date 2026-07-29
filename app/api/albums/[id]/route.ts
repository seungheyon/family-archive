import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const formData = await request.formData();
  const title = formData.get("title");

  if (typeof title === "string" && title.trim()) {
    const supabase = createServerSupabaseClient(env);
    await supabase.from("albums").update({ title: title.trim() }).eq("id", id);
  }

  return new Response(null, { status: 302, headers: { Location: "/review" } });
}
