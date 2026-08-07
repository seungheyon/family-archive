export type Season = "spring" | "summer" | "autumn" | "winter";

/**
 * 계절 판정.
 *
 * 사용자가 정한 구간: 6~9월 여름, 10~11월 가을. 나머지는 12~2월 겨울, 3~5월 봄으로 채웠다.
 * 색상 테마(살구/하늘/분홍/연두 4종 수동 선택)를 대체하는 개념이라, 사용자가 고르는 게
 * 아니라 날짜만으로 자동 결정된다.
 *
 * 한국 시간 기준으로 판정한다 — 서버(UTC)에서 그리든 브라우저에서 보든 같은 계절이 나와야
 * 새로고침할 때 배경이 바뀌는 일이 없다.
 */
export function getSeason(now: Date = new Date()): Season {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const month = kst.getUTCMonth() + 1;

  if (month >= 6 && month <= 9) return "summer";
  if (month >= 10 && month <= 11) return "autumn";
  if (month === 12 || month <= 2) return "winter";
  return "spring";
}

export const SEASON_LABEL: Record<Season, string> = {
  spring: "봄",
  summer: "여름",
  autumn: "가을",
  winter: "겨울",
};

/** 계절별로 흩날리는 입자의 개수 — 저사양 폰을 감안해 넉넉하지 않게 잡는다 */
export const PARTICLE_COUNT = 14;
