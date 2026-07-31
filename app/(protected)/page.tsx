import type { Metadata } from "next";
import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ThemeHintBubble } from "@/components/ThemeHintBubble";

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

export default async function AlbumListPage() {
  const { env } = await getCloudflareContext({ async: true });
  const supabase = createServerSupabaseClient(env);

  const { data: albums } = await supabase
    .from("albums")
    .select("id, title, date_start, date_end, photos(count)")
    .order("date_start", { ascending: false })
    .returns<AlbumRow[]>();

  const visibleAlbums =
    albums?.filter((album) => (album.photos?.[0]?.count ?? 0) > 0) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-8 text-2xl font-semibold text-foreground">
        앨범 목록
      </h1>

      <ThemeHintBubble />

      {visibleAlbums.length === 0 && (
        <p className="text-sm text-muted">
          아직 정리된 앨범이 없어요. 관리자라면{" "}
          <Link href="/upload" className="text-accent underline">
            사진을 업로드
          </Link>
          하고 정리하면 여기에 나타나요.
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
