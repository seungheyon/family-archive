import type { Metadata } from "next";
import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ThemeHintBubble } from "@/components/ThemeHintBubble";
import { FeedbackBanner } from "@/components/FeedbackBanner";

export const metadata: Metadata = {
  title: "앨범 목록",
};

interface AlbumRow {
  id: string;
  title: string;
  date_start: string | null;
  date_end: string | null;
  photos: { count: number }[];
}

export default async function AlbumListPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; count?: string }>;
}) {
  const { msg, count } = await searchParams;
  const { env } = await getCloudflareContext({ async: true });
  const supabase = createServerSupabaseClient(env);

  const [{ data: albums }, { count: unassignedCount }] = await Promise.all([
    supabase
      .from("albums")
      .select("id, title, date_start, date_end, photos(count)")
      .order("date_start", { ascending: false })
      .returns<AlbumRow[]>(),
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .is("album_id", null),
  ]);

  const visibleAlbums =
    albums?.filter((album) => (album.photos?.[0]?.count ?? 0) > 0) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-8 text-2xl font-semibold text-foreground">
        앨범 목록
      </h1>

      <ThemeHintBubble />
      <FeedbackBanner msg={msg} count={count} />

      <form
        action="/api/albums"
        method="POST"
        className="mb-6 flex flex-wrap items-center gap-2"
      >
        <input
          type="text"
          name="title"
          required
          placeholder="새 앨범 이름"
          className="input flex-1"
        />
        <button type="submit" className="btn-outline">
          새 앨범 만들기
        </button>
      </form>

      {!!unassignedCount && unassignedCount > 0 && (
        <Link
          href="/albums/unassigned"
          className="card mb-6 flex items-center justify-between text-sm transition-colors hover:border-accent"
        >
          <span className="text-foreground">미분류 사진이 있어요</span>
          <span className="text-muted">{unassignedCount}장</span>
        </Link>
      )}

      {visibleAlbums.length === 0 && (
        <p className="text-sm text-muted">
          아직 정리된 앨범이 없어요. 위에서 앨범을 만들고 들어가서 사진을
          업로드해 보세요.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {visibleAlbums.map((album) => (
          <li key={album.id}>
            <Link
              href={`/albums/${album.id}`}
              className="card flex items-center justify-between transition-colors hover:border-accent"
            >
              <span className="font-medium text-foreground">
                {album.title}
              </span>
              <span className="text-sm text-muted">
                사진 {album.photos?.[0]?.count ?? 0}장
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
