/**
 * 썸네일은 사진 id에서 바로 유도되는 고정 규칙의 키를 쓴다.
 *
 * 예전에는 썸네일 키도 무작위 UUID라 `/api/photos/[id]/file`이 파일을 꺼내기 전에 반드시
 * Supabase에 "이 사진의 키가 뭐냐"를 물어봐야 했다. 그리드에 사진이 N장이면 DB 왕복이 N번
 * 생기고, 실측상 이 왕복이 썸네일 1장당 0.57초 중 대부분을 차지했다(파일 자체는 20~46KB).
 * 키를 id에서 계산할 수 있으면 그 왕복이 통째로 사라진다.
 *
 * 원본은 업로드 당시의 파일명을 키에 포함하고 있어 규칙으로 유도할 수 없다 — 원본은 확대할
 * 때 한 장씩만 필요하므로 기존처럼 DB를 거친다.
 */
export function thumbKeyForPhoto(photoId: string): string {
  return `thumbs/${photoId}.jpg`;
}
