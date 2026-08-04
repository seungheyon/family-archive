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

  // 브라우저가 계산해서 보낸 실제 표시 크기(EXIF 회전 반영). 없으면 null로 두고,
  // 조회 시점에 폴백 처리한다 — 서버가 R2를 다시 읽어 헤더를 파싱하지 않는다.
  const dimensionsByIndex = new Map<number, { width: number; height: number }>();
  const dimensionsRaw = formData.get("dimensions");
  if (typeof dimensionsRaw === "string") {
    try {
      const parsed = JSON.parse(dimensionsRaw) as {
        index: number;
        width: number;
        height: number;
      }[];
      for (const d of parsed) {
        if (Number.isFinite(d.width) && Number.isFinite(d.height)) {
          dimensionsByIndex.set(d.index, { width: d.width, height: d.height });
        }
      }
    } catch {
      // 형식이 깨졌으면 크기 정보 없이 진행
    }
  }

  if (files.length === 0) {
    return Response.json({ error: "업로드할 사진이 없어요." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient(env);
  // 같은 업로드 배치 안에서 동일한 사진이 중복으로 들어온 경우를 잡기 위한 보조 장치
  // (파일별 처리를 병렬로 돌리면서 DB 조회만으로는 그 사이 레이스가 생길 수 있음)
  const seenHashes = new Set<string>();

  const results = await Promise.all(
    files.map(async (file, index) => {
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

        // EXIF 촬영일자/GPS는 서로 무관한 별도 파싱이라 병렬로 돌린다(순차로 하면 같은
        // 버퍼를 두 번 훑는 시간이 그대로 누적돼 업로드 체감 속도를 늦춘다).
        const [dateResult, gpsResult] = await Promise.all([
          exifr.parse(buffer, ["DateTimeOriginal"]).catch(() => null),
          exifr.gps(buffer).catch(() => null),
        ]);

        // EXIF 촬영일자 — 없으면 null (앨범 자동분류 대상에서 제외, 수동 분류로 폴백)
        const takenAt =
          dateResult?.DateTimeOriginal instanceof Date
            ? dateResult.DateTimeOriginal.toISOString()
            : null;

        // EXIF GPS — 없으면 null
        const gpsLat = gpsResult?.latitude ?? null;
        const gpsLng = gpsResult?.longitude ?? null;

        // 브라우저가 만들어 보낸 썸네일(있으면). 그리드에서 원본 대신 이걸 서빙해
        // 4~5MB짜리 원본을 썸네일 자리에 내려받는 낭비를 없앤다.
        const thumbEntry = formData.get(`thumb_${index}`);
        const thumbFile = thumbEntry instanceof File ? thumbEntry : null;
        const dims = dimensionsByIndex.get(index) ?? null;

        // R2 원본/썸네일 저장과 DB insert는 서로 독립적인 쓰기라 병렬로 돌린다 — 실패 시
        // Promise.all이 즉시 reject해 catch로 넘어가므로 처리 자체는 기존과 동일하다.
        const r2Key = `photos/${crypto.randomUUID()}-${file.name}`;
        const thumbKey = thumbFile ? `thumbs/${crypto.randomUUID()}.jpg` : null;

        const writes: Promise<unknown>[] = [
          env.PHOTOS_BUCKET.put(r2Key, buffer, {
            httpMetadata: { contentType: file.type || "application/octet-stream" },
          }),
        ];
        if (thumbFile && thumbKey) {
          writes.push(
            thumbFile.arrayBuffer().then((thumbBuffer) =>
              env.PHOTOS_BUCKET.put(thumbKey, thumbBuffer, {
                httpMetadata: { contentType: "image/jpeg" },
              }),
            ),
          );
        }

        const insertPromise = supabase.from("photos").insert({
          r2_key: r2Key,
          original_filename: file.name,
          taken_at: takenAt,
          gps_lat: gpsLat,
          gps_lng: gpsLng,
          content_hash: contentHash,
          album_id: albumId,
          width: dims?.width ?? null,
          height: dims?.height ?? null,
          thumb_key: thumbKey,
        });

        const [, insertResult] = await Promise.all([
          Promise.all(writes),
          insertPromise,
        ]);

        if (insertResult.error) throw new Error(insertResult.error.message);

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
