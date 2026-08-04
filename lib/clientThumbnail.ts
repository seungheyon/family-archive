/**
 * 업로드 직전에 브라우저에서 썸네일을 만들고 실제 표시 크기를 계산한다.
 *
 * 왜 브라우저에서 하나:
 * - Cloudflare Worker에 이미지 리사이즈용 WASM을 넣으면 번들 용량 제한에 걸릴 위험이 있다.
 * - 브라우저는 이미 이미지를 디코딩할 수 있고, EXIF 회전까지 반영된 "실제 보이는 크기"를
 *   그대로 알 수 있다 — 서버가 R2에서 파일을 다시 읽어 헤더를 파싱할 이유가 없어진다.
 *
 * 실패(HEIC 등 브라우저가 못 여는 포맷)하면 null을 돌려주고, 호출부는 썸네일/크기 없이
 * 원본만 업로드하도록 폴백한다.
 */

const MAX_THUMB_EDGE = 480;
const THUMB_QUALITY = 0.8;

export interface ThumbnailResult {
  blob: Blob;
  width: number;
  height: number;
}

export async function createThumbnail(file: File): Promise<ThumbnailResult | null> {
  if (typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap;
  try {
    // imageOrientation: "from-image" — EXIF 회전을 반영해서 디코딩하므로, 여기서 얻는
    // width/height가 브라우저가 실제로 화면에 그리는 방향의 크기와 일치한다.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }

  const { width, height } = bitmap;
  if (!width || !height) {
    bitmap.close();
    return null;
  }

  try {
    const scale = Math.min(1, MAX_THUMB_EDGE / Math.max(width, height));
    const tw = Math.max(1, Math.round(width * scale));
    const th = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, width, height };

    ctx.drawImage(bitmap, 0, 0, tw, th);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", THUMB_QUALITY),
    );
    if (!blob) return { blob: file, width, height };

    return { blob, width, height };
  } catch {
    // 크기만이라도 알아냈으면 그것만 넘긴다(원본을 썸네일 자리에 쓰게 되지만 치수 계산은 절약)
    return { blob: file, width, height };
  } finally {
    bitmap.close();
  }
}
