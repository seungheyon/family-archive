"use client";

import { motion } from "framer-motion";
import {
  COVER_OPEN_DEGREES,
  DURATION,
  PAPER_EASE,
  SPRING,
  STRIP_COUNT,
  STRIP_WEIGHTS,
  STRIP_WIDTH_PX,
} from "@/lib/motion";

/**
 * 앨범 표지 한 장.
 *
 * 예전에는 표지가 div 하나였고 그걸 통째로 155도 돌렸다. 판이 뻣뻣하게 젖혀지는
 * 움직임이라 종이로 보이지 않았다. 지금은 표지를 세로 10조각으로 나누고 각 조각을
 * 앞 조각 안에 넣어(중첩), 조각마다 조금씩만 더 꺾이게 한다. 꺾임이 누적되면서
 * 전체가 곡면이 되고, 바깥쪽 조각에 각도를 몰아줘서 손끝이 잡은 종이처럼 말린다.
 *
 * 중첩 구조라 각 조각은 부모의 오른쪽 끝(left: 100%)에 붙고 부모와 같은 폭을 가진다.
 * 표지 그림(가죽결·책등 명암)은 조각마다 `background-size: 1000%`로 늘린 뒤 자기 몫의
 * 위치만 잘라 쓰므로, 펴져 있을 때는 이음매 없이 한 장으로 보인다.
 *
 * 조각(`.book-strip`)은 회전만 담당하는 투명한 그릇이고, 실제로 보이는 면은 그 안의
 * 앞면(`.book-strip-face`)과 뒷면(`.book-strip-back`)이다. 조각 자체에 backface를
 * 숨기면 90도를 넘는 순간 자식 조각까지 통째로 사라지기 때문에 면을 따로 둔다.
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
  return (
    <div className="book-cover-root">
      {/* 닫혀 있는 동안에는 조각을 만들지 않는다. 넘어갈 때만 조각으로 바꾼다. */}
      {opening ? buildStrip(0) : <span className="book-cover-flat" aria-hidden="true" />}

      {/* 제목·날짜·장수 판.
          조각 트리 **밖**에 둔다. 예전에 첫 조각 안에 넣었더니 나머지 9조각이 그 자식으로
          라벨 위에 겹쳐 그려져, 책장에서 앨범을 구분할 수 없게 되는 회귀가 났다. 여기에
          두면 어떤 조각도 이 판을 덮을 수 없다(translateZ로 조각들보다 앞에 세운다).
          넘어가기 시작하면 첫 조각과 같은 각도로 살짝 기울면서 빠르게 사라진다. */}
      <motion.div
        className="book-cover-plate"
        // z-index는 조각 전체(최대 10)보다 위. 그리고 앞으로 세우는 값(z)은 반드시
        // framer가 관리하는 transform 안에 있어야 한다. CSS에 translateZ를 써두면
        // framer가 rotateY를 인라인 transform으로 덮어쓸 때 통째로 지워진다 —
        // 라벨이 조각과 같은 평면에 남아 가려졌던 원인이 이것이었다.
        style={{ zIndex: 50, z: 0.8 }}
        initial={false}
        animate={{
          opacity: opening ? 0 : 1,
          rotateY: opening ? -STRIP_WEIGHTS[0] * COVER_OPEN_DEGREES : 0,
          z: 0.8,
        }}
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
    </div>
  );

  function buildStrip(index: number): React.ReactNode {
    const degrees = STRIP_WEIGHTS[index] * COVER_OPEN_DEGREES;
    const delay = index * 0.018;
    const turn = {
      duration: DURATION.slow,
      ease: PAPER_EASE,
      delay,
    };

    return (
      <motion.div
        className={index === 0 ? "book-strip book-strip-first" : "book-strip"}
        style={{ zIndex: STRIP_COUNT - index }}
        initial={false}
        animate={{ rotateY: opening ? -degrees : 0 }}
        // 마우스 환경의 프리뷰 — 표지가 3~5도만 들린다(스킬 명세). 첫 조각만 움직이면
        // 책등에서 살짝 뜬 것처럼 보여서 조각 전체를 건드릴 필요가 없다.
        whileHover={!opening && index === 0 ? { rotateY: -5 } : undefined}
        transition={opening ? turn : SPRING}
      >
        <span
          className="book-strip-face"
          style={
            {
              "--strip-x": `${-index * STRIP_WIDTH_PX}px`,
              "--strip-slice": `${(index / (STRIP_COUNT - 1)) * 100}%`,
            } as React.CSSProperties
          }
          aria-hidden="true"
        >
          {/* 조각이 꺾인 만큼 어두워지는 음영 — 곡면을 눈으로 읽게 하는 실제 단서.
              바깥쪽 조각일수록 빛에서 멀어지므로 더 짙게 깔린다. */}
          <motion.span
            className="book-strip-shade"
            initial={false}
            animate={{ opacity: opening ? 0.1 + index * 0.05 : 0 }}
            transition={turn}
          />
        </span>

        {/* 넘어간 표지의 안쪽 — 마블링 면지. 90도를 넘어가면 이 면이 보인다 */}
        <span
          className="book-strip-back"
          style={
            {
              "--strip-x": `${index * STRIP_WIDTH_PX}px`,
              "--strip-slice": `${100 - (index / (STRIP_COUNT - 1)) * 100}%`,
            } as React.CSSProperties
          }
          aria-hidden="true"
        />

        {index + 1 < STRIP_COUNT && buildStrip(index + 1)}
      </motion.div>
    );
  }
}
