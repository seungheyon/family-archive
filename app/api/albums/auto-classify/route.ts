import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { clusterPhotosByDate } from "@/lib/classify";
import { isAuthenticated } from "@/lib/auth";

export async function POST() {
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAuthenticated(env.SESSION_SECRET))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServerSupabaseClient(env);

  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, taken_at")
    .is("album_id", null)
    .not("taken_at", "is", null);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const clusters = clusterPhotosByDate(
    (photos ?? []) as { id: string; taken_at: string }[],
  );

  for (const cluster of clusters) {
    const title =
      cluster.dateStart === cluster.dateEnd
        ? `${cluster.dateStart} (정리 필요)`
        : `${cluster.dateStart} ~ ${cluster.dateEnd} (정리 필요)`;

    const { data: album, error: albumError } = await supabase
      .from("albums")
      .insert({
        title,
        date_start: cluster.dateStart,
        date_end: cluster.dateEnd,
      })
      .select("id")
      .single();

    if (albumError || !album) continue;

    await supabase
      .from("photos")
      .update({ album_id: album.id })
      .in("id", cluster.photoIds);
  }

  const location =
    clusters.length === 0
      ? "/albums/unassigned?msg=classify-empty"
      : `/albums/unassigned?msg=classified&count=${clusters.length}`;

  return new Response(null, { status: 302, headers: { Location: location } });
}
