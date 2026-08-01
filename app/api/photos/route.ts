import { getCloudflareContext } from "@opennextjs/cloudflare";
import exifr from "exifr";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";
import { sha256Hex } from "@/lib/hash";

const MAX_FILE_BYTES = 30 * 1024 * 1024; // 30MB

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAuthenticated(env.SESSION_SECRET))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File);
  const albumIdRaw = formData.get("album_id");
  const albumId = typeof albumIdRaw === "string" && albumIdRaw ? albumIdRaw : null;

  if (files.length === 0) {
    return Response.json({ error: "업로드할 사진이 없어요." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient(env);
  // 같은 업로드 배치 안에서 동일한 사진이 중복으로 들어온 경우를 잡기 위한 보조 장치
  // (파일별 처리를 병렬로 돌리면서 DB 조회만으로는 그 사이 레이스가 생길 수 있음)
  const seenHashes = new Set<string>();

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        if (!file.type.startsWith("image/")) {
          return {
            filename: file.name,
            ok: false,
            error: "이미지 파일만 업로드할 수 있어요.",
          };
        }

        if (file.size > MAX_FILE_BYTES) {
          return {
            filename: file.name,
            ok: false,
            error: "파일이 너무 커요(30MB 초과).",
          };
        }

        const buffer = await file.arrayBuffer();
        const contentHash = await sha256Hex(buffer);

        if (seenHashes.has(contentHash)) {
          return {
            filename: file.name,
            ok: false,
            error: "이미 업로드된 사진과 동일해요(중복).",
          };
        }
        seenHashes.add(contentHash);

        const { data: existing } = await supabase
          .from("photos")
          .select("id")
          .eq("content_hash", contentHash)
          .maybeSingle();

        if (existing) {
          return {
            filename: file.name,
            ok: false,
            error: "이미 업로드된 사진과 동일해요(중복).",
          };
        }

        // EXIF 촬영일자 — 없으면 null (앨범 자동분류 대상에서 제외, 수동 분류로 폴백)
        let takenAt: string | null = null;
        try {
          const tags = await exifr.parse(buffer, ["DateTimeOriginal"]);
          if (tags?.DateTimeOriginal instanceof Date) {
            takenAt = tags.DateTimeOriginal.toISOString();
          }
        } catch {
          // EXIF 없음/파싱 실패
        }

        // EXIF GPS — 없으면 null
        let gpsLat: number | null = null;
        let gpsLng: number | null = null;
        try {
          const gps = await exifr.gps(buffer);
          if (gps) {
            gpsLat = gps.latitude;
            gpsLng = gps.longitude;
          }
        } catch {
          // GPS 정보 없음
        }

        const r2Key = `photos/${crypto.randomUUID()}-${file.name}`;
        await env.PHOTOS_BUCKET.put(r2Key, buffer, {
          httpMetadata: { contentType: file.type || "application/octet-stream" },
        });

        const { error } = await supabase.from("photos").insert({
          r2_key: r2Key,
          original_filename: file.name,
          taken_at: takenAt,
          gps_lat: gpsLat,
          gps_lng: gpsLng,
          content_hash: contentHash,
          album_id: albumId,
        });

        if (error) throw new Error(error.message);

        return { filename: file.name, ok: true };
      } catch (err) {
        return {
          filename: file.name,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  return Response.json({ results });
}
