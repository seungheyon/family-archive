import type { Metadata } from "next";
import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ThemeHintBubble } from "@/components/ThemeHintBubble";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { CreateAlbumButton } from "@/components/CreateAlbumButton";
import { QuickUploadButton } from "@/components/QuickUploadButton";
import { BackfillThumbsButton } from "@/components/BackfillThumbsButton";
import { NotificationToggle } from "@/components/NotificationToggle";
import { isAdmin } from "@/lib/auth";
import {
  buildAlbumDateRanges,
  formatDateRange,
  type PhotoDateRow,
} from "@/lib/albumDates";

export const metadata: Metadata = {
  title: "앨범 목록",
};

interface AlbumRow {
  id: string;
  title: string;
  photos: { count: number }[];
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
  const admin = await isAdmin(env.SESSION_SECRET);

  const [{ data: albums }, { count: unassignedCount }, { data: photoDates }] =
    await Promise.all([
      supabase
        .from("albums")
        .select("id, title, photos(count)")
        .returns<AlbumRow[]>(),
      supabase
        .from("photos")
        .select("id", { count: "exact", head: true })
        .is("album_id", null),
      // 앨범 날짜는 저장된 date_start 대신 사진에서 계산한다(lib/albumDates 참고)
      supabase
        .from("photos")
        .select("album_id, taken_at, uploaded_at")
        .not("album_id", "is", null)
        .returns<PhotoDateRow[]>(),
    ]);

  const dateRanges = buildAlbumDateRanges(photoDates ?? []);

  // 빈 앨범도 목록에 노출한다 — 예전엔 사진 0장인 앨범을 숨겼는데, 그러면 들어갈 수가 없어서
  // 사진을 넣지도 지우지도 못하는 상태가 됐다.
  // 정렬은 앨범의 가장 최근 날짜 기준 내림차순, 날짜를 알 수 없는 앨범은 맨 뒤로 보낸다.
  const sortedAlbums = [...(albums ?? [])].sort((a, b) => {
    const ra = dateRanges.get(a.id);
    const rb = dateRanges.get(b.id);
    if (ra && rb) return rb.end.localeCompare(ra.end);
    if (ra) return -1;
    if (rb) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <ThemeHintBubble />

      <h1 className="mb-10 text-2xl font-semibold text-foreground">앨범 목록</h1>

      <FeedbackBanner msg={msg} count={count} />

      {sortedAlbums.length === 0 && (
        <p className="text-sm text-muted">
          아직 앨범이 없어요. 아래에서 앨범을 만들고 들어가서 사진을 업로드해
          보세요.
        </p>
      )}

      {sortedAlbums.length > 0 && (
        <div className="bookshelf">
          <div className="bookshelf-grid">
            {sortedAlbums.map((album, i) => {
              const range = dateRanges.get(album.id);
              const photoCount = album.photos?.[0]?.count ?? 0;
              return (
                <Link
                  key={album.id}
                  href={`/albums/${album.id}`}
                  className="book-spine"
                  style={
                    {
                      "--book-color": BOOK_COLORS[i % BOOK_COLORS.length],
                    } as React.CSSProperties
                  }
                >
                  <span className="book-label">
                    <span className="line-clamp-3 text-center text-xs font-semibold leading-tight">
                      {album.title}
                    </span>
                  </span>
                  <span className="text-[10px] text-white/75">
                    {range ? formatDateRange(range) : "날짜 없음"}
                  </span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
                    사진 {photoCount}장
                  </span>
                </Link>
              );
            })}
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
        <NotificationToggle vapidPublicKey={env.VAPID_PUBLIC_KEY} />
        {admin && <BackfillThumbsButton />}
      </div>
    </div>
  );
}
