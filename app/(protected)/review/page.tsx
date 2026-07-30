import type { Metadata } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { DeleteButton } from "@/components/DeleteButton";
import { AlbumTitleForm } from "@/components/AlbumTitleForm";
import { FeedbackBanner } from "@/components/FeedbackBanner";

export const metadata: Metadata = {
  title: "앨범 정리",
};

interface AlbumRow {
  id: string;
  title: string;
  date_start: string | null;
  date_end: string | null;
  photos: { count: number }[];
}

interface UnassignedPhotoRow {
  id: string;
  original_filename: string | null;
  taken_at: string | null;
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; count?: string }>;
}) {
  const { msg, count } = await searchParams;
  const { env } = await getCloudflareContext({ async: true });
  const supabase = createServerSupabaseClient(env);
  const admin = await isAdmin(env.SESSION_SECRET);

  const [{ data: albums }, { data: unassigned }] = await Promise.all([
    supabase
      .from("albums")
      .select("id, title, date_start, date_end, photos(count)")
      .order("date_start", { ascending: false })
      .returns<AlbumRow[]>(),
    supabase
      .from("photos")
      .select("id, original_filename, taken_at")
      .is("album_id", null)
      .order("uploaded_at", { ascending: false })
      .returns<UnassignedPhotoRow[]>(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        앨범 정리
      </h1>

      <FeedbackBanner msg={msg} count={count} />

      <form action="/api/albums/auto-classify" method="POST" className="mb-10">
        <button type="submit" className="btn-primary">
          미분류 사진 자동 분류 실행
        </button>
        <p className="mt-2 text-xs text-muted">
          촬영일자(EXIF)가 있는 미분류 사진을 날짜 간격 기준으로 앨범으로
          묶어요. 촬영일자가 없는 사진은 아래에서 직접 배정해야 해요.
        </p>
      </form>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium text-foreground">
          앨범 ({albums?.length ?? 0})
        </h2>
        <ul className="flex flex-col gap-3">
          {albums?.map((album) => (
            <li key={album.id} className="card flex items-center gap-2">
              <div className="flex-1">
                <AlbumTitleForm albumId={album.id} initialTitle={album.title} />
              </div>
              <span className="text-sm text-muted">
                사진 {album.photos?.[0]?.count ?? 0}장
              </span>
            </li>
          ))}
          {(!albums || albums.length === 0) && (
            <p className="text-sm text-muted">아직 앨범이 없어요.</p>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-foreground">
          미분류 사진 ({unassigned?.length ?? 0})
        </h2>
        <ul className="flex flex-col gap-3">
          {unassigned?.map((photo) => (
            <li key={photo.id} className="card flex items-center gap-2 text-sm">
              <span className="flex-1">{photo.original_filename}</span>
              <span className="text-muted">
                {photo.taken_at
                  ? new Date(photo.taken_at).toLocaleDateString("ko-KR")
                  : "촬영일자 없음"}
              </span>
              <form
                action={`/api/photos/${photo.id}/assign`}
                method="POST"
                className="flex items-center gap-2"
              >
                <select
                  name="album_id"
                  required
                  defaultValue=""
                  className="input py-1"
                >
                  <option value="" disabled hidden>
                    앨범을 선택하세요
                  </option>
                  {albums?.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.title}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!albums || albums.length === 0}
                  title={
                    !albums || albums.length === 0
                      ? "먼저 앨범을 만들어야 배정할 수 있어요"
                      : "선택한 앨범으로 이 사진 옮기기"
                  }
                  className="btn-outline px-3 py-1"
                >
                  선택한 앨범으로 옮기기
                </button>
              </form>
              {admin && (
                <form action={`/api/photos/${photo.id}/delete`} method="POST">
                  <input type="hidden" name="redirect_to" value="/review" />
                  <DeleteButton />
                </form>
              )}
            </li>
          ))}
          {(!unassigned || unassigned.length === 0) && (
            <p className="text-sm text-muted">미분류 사진이 없어요.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
