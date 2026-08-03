import type { Metadata } from "next";
import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ThemeHintBubble } from "@/components/ThemeHintBubble";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { CreateAlbumButton } from "@/components/CreateAlbumButton";
import { QuickUploadButton } from "@/components/QuickUploadButton";

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

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
}

function formatDateRange(start: string, end: string) {
  return start === end
    ? formatDate(start)
    : `${formatDate(start)} ~ ${formatDate(end)}`;
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
    <div className="mx-auto max-w-3xl px-6 py-20">
      <ThemeHintBubble />

      <h1 className="mb-10 text-2xl font-semibold text-foreground">앨범 목록</h1>

      <FeedbackBanner msg={msg} count={count} />

      {visibleAlbums.length === 0 && (
        <p className="text-sm text-muted">
          아직 정리된 앨범이 없어요. 아래에서 앨범을 만들고 들어가서 사진을
          업로드해 보세요.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {visibleAlbums.map((album) => (
          <li key={album.id}>
            <Link
              href={`/albums/${album.id}`}
              className="card flex items-center justify-between gap-4 rounded-2xl p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-lg font-semibold text-foreground">
                  {album.title}
                </span>
                {album.date_start && album.date_end && (
                  <span className="text-sm text-muted">
                    {formatDateRange(album.date_start, album.date_end)}
                  </span>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                사진 {album.photos?.[0]?.count ?? 0}장
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* 앨범 목록보다 먼저 선택지를 던지지 않도록 의도적으로 목록 아래에 배치 */}
      <div className="mt-10 flex flex-wrap justify-end gap-2">
        <CreateAlbumButton />
        <QuickUploadButton />
        {!!unassignedCount && unassignedCount > 0 && (
          <Link href="/albums/unassigned" className="btn-tinted">
            앨범에 포함되지 않은 사진이 있어요!
          </Link>
        )}
      </div>
    </div>
  );
}
