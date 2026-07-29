import Link from "next/link";
import { notFound } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";

interface PhotoRow {
  id: string;
  taken_at: string | null;
}

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const supabase = createServerSupabaseClient(env);

  const { data: album } = await supabase
    .from("albums")
    .select("id, title")
    .eq("id", id)
    .single();

  if (!album) {
    notFound();
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("id, taken_at")
    .eq("album_id", id)
    .order("taken_at", { ascending: true })
    .returns<PhotoRow[]>();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-zinc-500 hover:underline"
      >
        ← 앨범 목록
      </Link>
      <h1 className="mb-8 text-2xl font-semibold text-black dark:text-zinc-50">
        {album.title}
      </h1>

      {(!photos || photos.length === 0) && (
        <p className="text-sm text-zinc-500">이 앨범엔 아직 사진이 없어요.</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {photos?.map((photo) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.id}
            src={`/api/photos/${photo.id}/file`}
            alt=""
            loading="lazy"
            className="aspect-square w-full rounded-md object-cover"
          />
        ))}
      </div>
    </div>
  );
}
