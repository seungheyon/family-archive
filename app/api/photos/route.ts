import { getCloudflareContext } from "@opennextjs/cloudflare";
import exifr from "exifr";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  if (!(await isAuthenticated(env.SESSION_SECRET))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return Response.json({ error: "업로드할 사진이 없어요." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient(env);
  const results: Array<{ filename: string; ok: boolean; error?: string }> = [];

  for (const file of files) {
    try {
      const buffer = await file.arrayBuffer();

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
      });

      if (error) throw new Error(error.message);

      results.push({ filename: file.name, ok: true });
    } catch (err) {
      results.push({
        filename: file.name,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return Response.json({ results });
}
