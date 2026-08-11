"use client";

import { motion } from "framer-motion";
import {
  COVER_OPEN_DEGREES,
  COVER_TURN_SECONDS,
  DURATION,
  PAPER_EASE,
  SPRING,
} from "@/lib/motion";

/**
 * 앨범 표지 한 장.
 *
 * 표지를 세로 조각으로 쪼개 곡률을 만드는 방식을 먼저 시도했다가 되돌렸다. 표지 폭이
 * 118px이라 조각 하나가 6.5px밖에 안 되고, 브라우저가 요소 경계와 배경 위치를 기기
 * 픽셀에 맞춰 반올림하는 데다 조각마다 `backface-visibility`로 별도 레이어가 생겨
 * 따로 래스터화된다. 그래서 조각 경계마다 머리카락 굵기의 이음매가 남아 표지에 세로선이
 * 그어졌다. 조각 수를 10에서 18로 바꿔봐도 줄의 간격만 달라질 뿐 사라지지 않았다.
 * 이 크기에서 기하학적 곡률은 어차피 거의 보이지 않으므로, 지금은 이음매가 생길 수 없는
 * 한 장짜리 표지를 쓰고 종이의 느낌은 전부 빛과 그늘로 만든다.
 *
 * 종이로 읽히게 하는 실제 단서 세 가지:
 *  - 오버슛 없는 감속(spring 금지) — 종이는 되튀지 않는다
 *  - 회전에 따라 표면을 훑고 지나가는 광택과, 경첩 쪽부터 짙어지는 그늘
 *  - 넘어가는 동안 아주 살짝 눌리는 가로 폭(휘어질 때 투영 폭이 줄어드는 것)
 */
export function BookCover({
  opening,
  title,
  dateLabel,
  photoCount,
}: {
  opening: boolean;
  title: string;
  dateLabel: string;
  photoCount: number;
}) {
  const turn = { duration: COVER_TURN_SECONDS, ease: PAPER_EASE };

  return (
    <div className="book-cover-root">
      {/* 책배(속장의 윗면). 표지 회전 영역 밖에 있어 표지를 침범하지 않고, 표지가
          넘어가도 제자리에 남는다 — 실물에서도 표지만 넘어가고 책배는 그대로다. */}
      <span className="book-page-block" aria-hidden="true" />

      <motion.div
        className="book-cover-turn"
        initial={false}
        animate={{
          rotateY: opening ? -COVER_OPEN_DEGREES : 0,
          scaleX: opening ? 0.97 : 1,
        }}
        whileHover={opening ? undefined : { rotateY: -5 }}
        transition={opening ? turn : SPRING}
      >
        {/* 앞면 — 가죽 표지 */}
        <span className="book-cover-face" aria-hidden="true">
          {/* 회전에 따라 표면을 훑는 광택. 넘어가는 동안 왼쪽에서 오른쪽으로 지나간다 */}
          <motion.span
            className="book-cover-gloss"
            initial={false}
            animate={{
              backgroundPositionX: opening ? "160%" : "-60%",
              opacity: opening ? 0.85 : 0.3,
            }}
            transition={opening ? turn : SPRING}
          />
          {/* 경첩 쪽부터 짙어지는 그늘 — 평면을 곡면으로 읽게 만드는 주된 단서 */}
          <motion.span
            className="book-cover-shade"
            initial={false}
            animate={{ opacity: opening ? 1 : 0 }}
            transition={opening ? turn : SPRING}
          />
        </span>

        {/* 뒷면 — 넘어간 표지의 안쪽(양피지 면지) */}
        <span className="book-cover-verso" aria-hidden="true" />

        {/* 제목·날짜·장수 판. 표지와 함께 회전하되 앞으로 세워(z) 가려지지 않게 한다.
            앞으로 세우는 값은 반드시 framer가 관리하는 transform 안에 있어야 한다 —
            CSS에 translateZ를 써두면 framer가 transform을 다시 쓸 때 통째로 지워진다. */}
        <motion.div
          className="book-cover-plate"
          style={{ zIndex: 50, z: 0.8 }}
          initial={false}
          animate={{ opacity: opening ? 0 : 1, z: 0.8 }}
          transition={
            opening
              ? { duration: DURATION.fast, ease: PAPER_EASE }
              : { duration: DURATION.base, ease: PAPER_EASE }
          }
        >
          <span className="book-label">
            <span className="line-clamp-3 text-center text-xs font-semibold leading-tight">
              {title}
            </span>
          </span>
          <span className="text-[10px] text-white/75">{dateLabel}</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
            사진 {photoCount}장
          </span>
          <span className="book-cover-sheen" aria-hidden="true" />
        </motion.div>
      </motion.div>
    </div>
  );
}
