import Link from "next/link";
import { notFound } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { AlbumGrid } from "@/components/AlbumGrid";
import { AlbumManageMenu } from "@/components/AlbumManageMenu";
import { UploadForm } from "@/components/UploadForm";
import { getImageDimensions } from "@/lib/imageDimensions";

interface PhotoRow {
  id: string;
  taken_at: string | null;
  r2_key: string;
}

interface AlbumOptionRow {
  id: string;
  title: string;
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
  const admin = await isAdmin(env.SESSION_SECRET);

  const { data: album } = await supabase
    .from("albums")
    .select("id, title")
    .eq("id", id)
    .single();

  if (!album) {
    notFound();
  }

  const [{ data: photos }, { data: otherAlbums }] = await Promise.all([
    supabase
      .from("photos")
      .select("id, taken_at, r2_key")
      .eq("album_id", id)
      .order("taken_at", { ascending: true })
      .returns<PhotoRow[]>(),
    supabase
      .from("albums")
      .select("id, title")
      .neq("id", id)
      .order("title", { ascending: true })
      .returns<AlbumOptionRow[]>(),
  ]);

  const photosWithDimensions = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const dims = await getImageDimensions(env.PHOTOS_BUCKET, photo.r2_key);
      return { id: photo.id, width: dims?.width, height: dims?.height };
    }),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-muted hover:text-accent"
      >
        ← 앨범 목록
      </Link>

      <div className="mb-8 flex items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-2xl font-semibold text-foreground">
          {album.title}
        </h1>
        <AlbumManageMenu
          albumId={album.id}
          initialTitle={album.title}
          otherAlbums={otherAlbums ?? []}
          admin={admin}
        />
      </div>

      <FeedbackBanner msg={msg} count={count} />

      <div className="mb-8">
        <UploadForm albumId={album.id} />
      </div>

      {(!photos || photos.length === 0) && (
        <p className="text-sm text-muted">이 앨범엔 아직 사진이 없어요.</p>
      )}

      <AlbumGrid
        photos={photosWithDimensions}
        albums={otherAlbums ?? []}
        admin={admin}
      />
    </div>
  );
}
