import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";
import { findDuplicateAlbumTitle } from "@/lib/albumTitle";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAuthenticated(env.SESSION_SECRET))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const title = formData.get("title");

  if (typeof title !== "string" || !title.trim()) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/" },
    });
  }

  const supabase = createServerSupabaseClient(env);

  if (await findDuplicateAlbumTitle(supabase, title)) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/?msg=album-duplicate" },
    });
  }

  await supabase.from("albums").insert({ title: title.trim() });

  return new Response(null, {
    status: 302,
    headers: { Location: "/?msg=album-created" },
  });
}
