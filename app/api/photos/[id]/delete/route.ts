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
  const redirectTo = formData.get("redirect_to");

  const supabase = createServerSupabaseClient(env);
  const { data: photo } = await supabase
    .from("photos")
    .select("r2_key")
    .eq("id", id)
    .single();

  if (photo) {
    await env.PHOTOS_BUCKET.delete(photo.r2_key);
    await supabase.from("photos").delete().eq("id", id);
  }

  const base =
    typeof redirectTo === "string" && redirectTo.startsWith("/")
      ? redirectTo
      : "/review";
  const location = `${base}${base.includes("?") ? "&" : "?"}msg=deleted`;

  return new Response(null, { status: 302, headers: { Location: location } });
}
