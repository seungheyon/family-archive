import Link from "next/link";
import { notFound } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { AlbumGrid } from "@/components/AlbumGrid";
import { AlbumManageMenu } from "@/components/AlbumManageMenu";

interface PhotoRow {
  id: string;
  taken_at: string | null;
  width: number | null;
  height: number | null;
  thumb_key: string | null;
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
      .select("id, taken_at, width, height, thumb_key")
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

  // 사진 크기는 업로드 시 DB에 저장해두므로 여기서 R2를 다시 읽지 않는다 —
  // 예전에는 사진마다 R2에서 256KB씩 읽어 헤더를 파싱했고, 그게 앨범 페이지 응답이
  // 1.4~3.9초씩 걸리던 주된 원인이었다.
  const photosWithDimensions = (photos ?? []).map((photo) => ({
    id: photo.id,
    width: photo.width ?? undefined,
    height: photo.height ?? undefined,
    hasThumb: !!photo.thumb_key,
  }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-muted hover:text-accent"
      >
        ← 앨범 목록
      </Link>

      <div className="mb-8 flex items-center justify-between gap-2">
        <h1 className="min-w-0 line-clamp-2 text-2xl font-semibold text-foreground">
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

      <AlbumGrid
        photos={photosWithDimensions}
        albums={otherAlbums ?? []}
        admin={admin}
        albumId={album.id}
      />
    </div>
  );
}
