import Link from "next/link";
import { notFound } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { DeleteButton } from "@/components/DeleteButton";
import { FeedbackBanner } from "@/components/FeedbackBanner";

interface PhotoRow {
  id: string;
  taken_at: string | null;
}

export default async function AlbumDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; count?: string }>;
}) {
  const { id } = await params;
  const { msg, count } = await searchParams;
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

      <FeedbackBanner msg={msg} count={count} />

      {(!photos || photos.length === 0) && (
        <p className="text-sm text-zinc-500">이 앨범엔 아직 사진이 없어요.</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {photos?.map((photo) => (
          <div key={photo.id} className="group relative">
            <Link href={`/albums/${id}/photos/${photo.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${photo.id}/file`}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-md object-cover"
              />
            </Link>
            <form
              action={`/api/photos/${photo.id}/delete`}
              method="POST"
              className="absolute right-1 top-1"
            >
              <input type="hidden" name="redirect_to" value={`/albums/${id}`} />
              <DeleteButton
                label="✕"
                className="rounded-full bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
