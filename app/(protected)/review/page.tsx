import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";

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

export default async function ReviewPage() {
  const { env } = await getCloudflareContext({ async: true });
  const supabase = createServerSupabaseClient(env);

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
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        앨범 정리
      </h1>

      <form action="/api/albums/auto-classify" method="POST" className="mb-10">
        <button
          type="submit"
          className="rounded-full bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          미분류 사진 자동 분류 실행
        </button>
      </form>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium text-black dark:text-zinc-50">
          앨범 ({albums?.length ?? 0})
        </h2>
        <ul className="flex flex-col gap-3">
          {albums?.map((album) => (
            <li
              key={album.id}
              className="rounded-md border border-black/10 p-4 dark:border-white/10"
            >
              <form
                action={`/api/albums/${album.id}`}
                method="POST"
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  name="title"
                  defaultValue={album.title}
                  className="flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1 dark:border-white/10"
                />
                <span className="text-sm text-zinc-500">
                  사진 {album.photos?.[0]?.count ?? 0}장
                </span>
                <button
                  type="submit"
                  className="rounded-full border border-black/10 px-3 py-1 text-sm dark:border-white/10"
                >
                  저장
                </button>
              </form>
            </li>
          ))}
          {(!albums || albums.length === 0) && (
            <p className="text-sm text-zinc-500">아직 앨범이 없어요.</p>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-black dark:text-zinc-50">
          미분류 사진 ({unassigned?.length ?? 0})
        </h2>
        <ul className="flex flex-col gap-3">
          {unassigned?.map((photo) => (
            <li
              key={photo.id}
              className="flex items-center gap-2 rounded-md border border-black/10 p-3 text-sm dark:border-white/10"
            >
              <span className="flex-1">{photo.original_filename}</span>
              <span className="text-zinc-500">
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
                  className="rounded-md border border-black/10 bg-transparent px-2 py-1 dark:border-white/10"
                >
                  <option value="">앨범 선택</option>
                  {albums?.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.title}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-full border border-black/10 px-3 py-1 text-sm dark:border-white/10"
                >
                  배정
                </button>
              </form>
            </li>
          ))}
          {(!unassigned || unassigned.length === 0) && (
            <p className="text-sm text-zinc-500">미분류 사진이 없어요.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
