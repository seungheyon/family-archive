import type { Transition, Variants } from "framer-motion";

/**
 * 프로젝트 전역 모션 프리셋.
 *
 * `book-open-interaction` 스킬의 일관성 규칙을 코드로 고정한 것:
 * - 이징은 전역에서 **하나의 spring 프리셋**만 쓴다(개별 컴포넌트에서 새로 만들지 않는다)
 * - duration은 **300 / 500 / 800ms 셋 중 하나만** 쓴다
 *
 * 애니메이션 대상은 `transform`/`opacity`/`filter`로 제한한다 — width·height·top 같은
 * 레이아웃 속성을 애니메이션하면 매 프레임 리플로우가 생겨 저사양 폰에서 눈에 띄게 끊긴다.
 */

/** 전역 단일 spring 프리셋 */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 160,
  damping: 20,
};

/** 허용된 duration 삼종 (ms) */
export const DURATION = {
  fast: 0.3,
  base: 0.5,
  slow: 0.8,
} as const;

/** 표지가 열릴 때처럼 되돌릴 수 없는 큰 전환에 쓰는 느린 spring */
export const SPRING_SLOW: Transition = {
  ...SPRING,
  stiffness: 120,
  damping: 22,
};

/**
 * 종이가 넘어갈 때의 이징.
 *
 * spring을 쓰지 않는 유일한 예외다. spring은 목표 각도를 지나쳤다 되돌아오는데(오버슛),
 * 종이는 되튀지 않는다. 표지에 spring을 걸었을 때 "플라스틱 판때기" 같아 보였던 원인이
 * 이것이라 여기서만 오버슛 없는 감속 곡선을 쓴다. 손을 떠난 뒤 공기저항으로 잦아드는
 * 움직임에 가깝게 초반은 빠르고 끝에서 길게 눕는다.
 */
export const PAPER_EASE = [0.22, 0.61, 0.36, 1] as const;

/**
 * 조각 하나의 실제 폭(px). `.book-stage`의 고정 폭 118px을 조각 수로 나눈 값이다.
 * 가죽결 무늬를 조각 경계에서 이어붙일 때 이만큼씩 밀어야 이음매가 보이지 않는다.
 */
export const STRIP_WIDTH_PX = 11.8;

/** 표지를 세로로 몇 조각 내어 곡면을 근사할지 */
export const STRIP_COUNT = 10;

/** 표지가 다 열렸을 때 맨 끝 조각의 누적 각도 */
export const COVER_OPEN_DEGREES = 155;

/**
 * 조각별 회전 분배 가중치(합 = 1).
 *
 * 첫 조각(책등의 경첩)이 절반을 가져가고, 나머지를 바깥쪽으로 갈수록 조금씩 늘려 배분한다.
 * 처음에는 반대로 바깥쪽에 몰아줬는데(0.03 → 0.17), 그러면 표지가 열리는 대신 책등 쪽으로
 * 말려 올라가서 두루마리처럼 보였다. 책이 열리는 것으로 읽히려면 경첩에서 크게 꺾이고
 * 종이 자체는 살짝만 휘어야 한다 — 회전 각도의 대부분은 경첩 몫이다.
 */
export const STRIP_WEIGHTS = [
  0.5, 0.06, 0.05, 0.05, 0.05, 0.05, 0.055, 0.06, 0.06, 0.065,
] as const;

/**
 * 내지 사진이 순차 등장할 때의 간격.
 *
 * 스킬 명세는 50~100ms지만 그 하한보다 더 짧게 잡았다. 예전에는 여기에 더해
 * `delayChildren`으로 300ms를 먼저 비웠는데, 사진이 보이기까지의 시간에 그대로
 * 얹히는 값이라 "앨범이 느리다"는 체감의 한 축이었다. 화면 첫 줄이 즉시 차는 것이
 * 순차 등장의 리듬보다 중요하다고 보고 지연은 없애고 간격만 남겼다.
 */
export const STAGGER_SECONDS = 0.04;

/** 펼쳐진 뒤 사진들이 하나씩 나타나는 컨테이너/아이템 variants */
export const photoStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STAGGER_SECONDS,
    },
  },
};

export const photoItem: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING,
  },
};

/** 화면(라우트) 단위 진입 — 종이가 놓이듯 아주 짧게 */
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

/**
 * 커서 위치에 따른 미세 3D 틸트 각도를 구한다.
 * 손가락 입력에는 호버 개념이 없어 포인터가 마우스일 때만 쓰는 값이다.
 */
export function tiltFromPointer(
  event: React.PointerEvent<HTMLElement>,
  maxDegrees = 6,
): { rotateX: number; rotateY: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width - 0.5;
  const py = (event.clientY - rect.top) / rect.height - 0.5;
  return {
    rotateX: -py * maxDegrees * 2,
    rotateY: px * maxDegrees * 2,
  };
}
