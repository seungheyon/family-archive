import { imageSize } from "image-size";

const HEADER_BYTES = 256 * 1024;

// EXIF orientation 5~8은 90도 계열 회전이라, 브라우저가 <img>를 자동 회전해서 보여준다.
// image-size는 회전을 반영하지 않은 원본 픽셀 width/height를 그대로 주기 때문에,
// 이 값들을 그대로 PhotoSwipe에 넘기면 실제 표시되는 비율과 어긋나 사진이 눌려 보인다.
function normalizeForOrientation(
  width: number,
  height: number,
  orientation: number | undefined,
): { width: number; height: number } {
  if (orientation && orientation >= 5 && orientation <= 8) {
    return { width: height, height: width };
  }
  return { width, height };
}

export async function getImageDimensions(
  bucket: R2Bucket,
  r2Key: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const head = await bucket.get(r2Key, { range: { offset: 0, length: HEADER_BYTES } });
    if (!head) return null;
    const headBuffer = await head.arrayBuffer();
    try {
      const dims = imageSize(new Uint8Array(headBuffer));
      return normalizeForOrientation(dims.width, dims.height, dims.orientation);
    } catch {
      // 헤더만으로 부족한 경우(썸네일이 커서 SOF 마커가 더 뒤에 있는 등) 전체를 다시 읽어 재시도
      const full = await bucket.get(r2Key);
      if (!full) return null;
      const fullBuffer = await full.arrayBuffer();
      const dims = imageSize(new Uint8Array(fullBuffer));
      return normalizeForOrientation(dims.width, dims.height, dims.orientation);
    }
  } catch {
    return null;
  }
}
