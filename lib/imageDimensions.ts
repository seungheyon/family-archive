import { imageSize } from "image-size";

const HEADER_BYTES = 256 * 1024;

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
      return { width: dims.width, height: dims.height };
    } catch {
      // 헤더만으로 부족한 경우(썸네일이 커서 SOF 마커가 더 뒤에 있는 등) 전체를 다시 읽어 재시도
      const full = await bucket.get(r2Key);
      if (!full) return null;
      const fullBuffer = await full.arrayBuffer();
      const dims = imageSize(new Uint8Array(fullBuffer));
      return { width: dims.width, height: dims.height };
    }
  } catch {
    return null;
  }
}
