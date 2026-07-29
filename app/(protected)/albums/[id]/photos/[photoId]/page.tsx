import Link from "next/link";
import { notFound } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { DeleteButton } from "@/components/DeleteButton";

interface PhotoRow {
  id: string;
  taken_at: string | null;
}

export default async function PhotoDetailPage({
  params,
}: {
  params: Promise<{ id: string; photoId: string }>;
}) {
  const { id: albumId, photoId } = await params;
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

  const { data: photos } = await supabase
    .from("photos")
    .select("id, taken_at")
    .eq("album_id", albumId)
    .order("taken_at", { ascending: true })
    .returns<PhotoRow[]>();

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
          className="text-zinc-500 hover:underline"
        >
          ← {album.title}
        </Link>
        <span className="text-zinc-500">
          {index + 1} / {list.length}
        </span>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/photos/${current.id}/file`}
        alt=""
        className="max-h-[70vh] w-auto rounded-md object-contain"
      />

      <p className="mt-3 text-sm text-zinc-500">
        {current.taken_at
          ? new Date(current.taken_at).toLocaleString("ko-KR")
          : "촬영일자 정보 없음"}
      </p>

      <div className="mt-6 flex w-full items-center justify-between">
        {prev ? (
          <Link
            href={`/albums/${albumId}/photos/${prev.id}`}
            className="rounded-full border border-black/10 px-4 py-2 text-sm dark:border-white/10"
          >
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
          <Link
            href={`/albums/${albumId}/photos/${next.id}`}
            className="rounded-full border border-black/10 px-4 py-2 text-sm dark:border-white/10"
          >
            다음 →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
