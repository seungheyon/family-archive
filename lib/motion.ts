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
