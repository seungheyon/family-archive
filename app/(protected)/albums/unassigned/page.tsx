import type { Metadata } from "next";
import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { AlbumGrid } from "@/components/AlbumGrid";
import { getImageDimensions } from "@/lib/imageDimensions";
import { DeleteButton } from "@/components/DeleteButton";

export const metadata: Metadata = {
  title: "미분류 사진",
};

interface PhotoRow {
  id: string;
  taken_at: string | null;
  r2_key: string;
}

interface AlbumOptionRow {
  id: string;
  title: string;
}

export default async function UnassignedPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; count?: string }>;
}) {
  const { msg, count } = await searchParams;
  const { env } = await getCloudflareContext({ async: true });
  const supabase = createServerSupabaseClient(env);
  const admin = await isAdmin(env.SESSION_SECRET);

  const [{ data: photos }, { data: albums }] = await Promise.all([
    supabase
      .from("photos")
      .select("id, taken_at, r2_key")
      .is("album_id", null)
      .order("uploaded_at", { ascending: false })
      .returns<PhotoRow[]>(),
    supabase
      .from("albums")
      .select("id, title")
      .order("title", { ascending: true })
      .returns<AlbumOptionRow[]>(),
  ]);

  const photosWithDimensions = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const dims = await getImageDimensions(env.PHOTOS_BUCKET, photo.r2_key);
      return { id: photo.id, width: dims?.width, height: dims?.height };
    }),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-muted hover:text-accent"
      >
        ← 앨범 목록
      </Link>
      <h1 className="mb-8 text-2xl font-semibold text-foreground">
        미분류 사진
      </h1>

      <FeedbackBanner msg={msg} count={count} />

      <form action="/api/albums/auto-classify" method="POST" className="mb-8">
        <DeleteButton
          label="촬영일자 있는 사진 자동 분류"
          confirmMessage="촬영일자를 기준으로 사진 날짜별 앨범이 자동으로 생성돼요. 계속할까요?"
          className="btn-primary"
        />
        <p className="mt-2 text-xs text-muted">
          촬영일자(EXIF)가 있는 사진을 날짜 간격 기준으로 새 앨범으로 묶어요.
          촬영일자가 없는 사진은 아래에서 길게 눌러 선택한 뒤 직접 앨범으로
          옮겨야 해요.
        </p>
      </form>

      <AlbumGrid
        photos={photosWithDimensions}
        albums={albums ?? []}
        admin={admin}
        emptyMessage="미분류 사진이 없어요."
      />
    </div>
  );
}
