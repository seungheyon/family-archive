import Link from "next/link";
import { notFound } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { DeleteButton } from "@/components/DeleteButton";
import { FeedbackBanner } from "@/components/FeedbackBanner";

interface PhotoRow {
  id: string;
  taken_at: string | null;
}

interface AlbumOptionRow {
  id: string;
  title: string;
}

export default async function PhotoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; photoId: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const { id: albumId, photoId } = await params;
  const { msg } = await searchParams;
  const { env } = await getCloudflareContext({ async: true });
  const supabase = createServerSupabaseClient(env);
  const admin = await isAdmin(env.SESSION_SECRET);

  const { data: album } = await supabase
    .from("albums")
    .select("id, title")
    .eq("id", albumId)
    .single();

  if (!album) {
    notFound();
  }

  const [{ data: photos }, { data: otherAlbums }] = await Promise.all([
    supabase
      .from("photos")
      .select("id, taken_at")
      .eq("album_id", albumId)
      .order("taken_at", { ascending: true })
      .returns<PhotoRow[]>(),
    supabase
      .from("albums")
      .select("id, title")
      .neq("id", albumId)
      .order("title", { ascending: true })
      .returns<AlbumOptionRow[]>(),
  ]);

  const list = photos ?? [];
  const index = list.findIndex((p) => p.id === photoId);

  if (index === -1) {
    notFound();
  }

  const current = list[index];
  const prev = index > 0 ? list[index - 1] : null;
  const next = index < list.length - 1 ? list[index + 1] : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-10">
      <div className="mb-4 flex w-full items-center justify-between text-sm">
        <Link
          href={`/albums/${albumId}`}
          className="text-muted hover:text-accent"
        >
          ← {album.title}
        </Link>
        <span className="text-muted">
          {index + 1} / {list.length}
        </span>
      </div>

      <div className="mb-4 w-full">
        <FeedbackBanner msg={msg} />
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/photos/${current.id}/file`}
        alt=""
        className="max-h-[70vh] w-auto rounded-xl object-contain"
      />

      <p className="mt-3 text-sm text-muted">
        {current.taken_at
          ? new Date(current.taken_at).toLocaleString("ko-KR")
          : "촬영일자 정보 없음"}
      </p>

      {otherAlbums && otherAlbums.length > 0 && (
        <form
          action={`/api/photos/${current.id}/assign`}
          method="POST"
          className="mt-4 flex flex-wrap items-center gap-2 text-sm"
        >
          <input
            type="hidden"
            name="redirect_to"
            value={`/albums/${albumId}`}
          />
          <select name="album_id" required defaultValue="" className="select">
            <option value="" disabled hidden>
              다른 앨범으로 이동
            </option>
            {otherAlbums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-outline">
            이동
          </button>
        </form>
      )}

      <div className="mt-6 flex w-full items-center justify-between">
        {prev ? (
          <Link href={`/albums/${albumId}/photos/${prev.id}`} className="btn-outline">
            ← 이전
          </Link>
        ) : (
          <span />
        )}

        {admin ? (
          <form action={`/api/photos/${current.id}/delete`} method="POST">
            <input
              type="hidden"
              name="redirect_to"
              value={`/albums/${albumId}`}
            />
            <DeleteButton label="이 사진 삭제" />
          </form>
        ) : (
          <span />
        )}

        {next ? (
          <Link href={`/albums/${albumId}/photos/${next.id}`} className="btn-outline">
            다음 →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
