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

// 실제 책장처럼 책마다 표지색이 다르게 보이도록 순환시키는 팔레트. 앱 테마(살구/하늘/분홍/연두)와는
// 무관 — 책 표지색은 가구/소품의 색이지 테마가 적용되는 UI 크롬이 아니라고 판단.
const BOOK_COLORS = [
  "#8B3A3A",
  "#2F4B5C",
  "#3F5B3F",
  "#8A6D3B",
  "#5C3A5C",
  "#3A6B6B",
];

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

      {visibleAlbums.length > 0 && (
        <div className="bookshelf">
          <div className="bookshelf-grid">
            {visibleAlbums.map((album, i) => (
              <Link
                key={album.id}
                href={`/albums/${album.id}`}
                className="book-spine"
                style={{ "--book-color": BOOK_COLORS[i % BOOK_COLORS.length] } as React.CSSProperties}
              >
                <span className="book-label">
                  <span className="line-clamp-3 text-center text-xs font-semibold leading-tight">
                    {album.title}
                  </span>
                </span>
                {album.date_start && album.date_end && (
                  <span className="text-[10px] text-white/75">
                    {formatDateRange(album.date_start, album.date_end)}
                  </span>
                )}
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
                  사진 {album.photos?.[0]?.count ?? 0}장
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 앨범 목록보다 먼저 선택지를 던지지 않도록 의도적으로 목록 아래에 배치 */}
      <div className="mt-10 flex flex-col items-start gap-3">
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
