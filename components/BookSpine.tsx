"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { SPRING, SPRING_SLOW, tiltFromPointer } from "@/lib/motion";
import { BookCover } from "@/components/BookCover";

/**
 * 책장에 꽂힌 책 한 권(앨범 하나).
 *
 * 상태: closed → opening → (라우팅) 으로 진행한다. 표지가 책등을 축으로 열리는 동안
 * 카드가 화면 중앙으로 확대되고, 애니메이션이 끝나면 앨범 상세로 이동한다.
 * 이렇게 해야 "책을 펼쳐서 그 안을 본다"는 은유가 화면 전환과 이어진다.
 */
export function BookSpine({
  albumId,
  title,
  dateLabel,
  photoCount,
  coverColor,
}: {
  albumId: string;
  title: string;
  dateLabel: string;
  photoCount: number;
  coverColor: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"closed" | "opening">("closed");

  // 커서 근접 시의 미세 틸트 — 스프링을 통과시켜 손맛이 나게 한다
  const rotateX = useSpring(useMotionValue(0), SPRING);
  const rotateY = useSpring(useMotionValue(0), SPRING);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || phase !== "closed") return;
    const tilt = tiltFromPointer(event, 5);
    rotateX.set(tilt.rotateX);
    rotateY.set(tilt.rotateY);
  }

  function resetTilt() {
    rotateX.set(0);
    rotateY.set(0);
  }

  function open() {
    if (phase !== "closed") return;
    resetTilt();
    setPhase("opening");
    // 이동을 즉시 시작하고 표지 열림은 그 위에서 계속 재생한다. 예전에는 열림이 끊겨
    // 보이는 것을 막으려고 800ms를 기다린 뒤 push했는데, 그동안 네트워크 요청조차
    // 시작되지 않아 연출 시간이 응답 시간에 그대로 더해졌다(탭에서 사진까지 약 2초).
    // 연출과 통신을 겹치면 체감 시간은 둘 중 긴 쪽이 된다.
    router.push(`/albums/${albumId}`);
  }

  // 손가락이 닿는 순간(=클릭이 확정되기 전) 미리 받아두면 실제 이동이 거의 즉시 끝난다.
  function prefetch() {
    router.prefetch(`/albums/${albumId}`);
  }

  return (
    <div
      ref={containerRef}
      className="book-stage"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onPointerEnter={prefetch}
      onPointerDown={prefetch}
    >
      <motion.div
        className="book-spine"
        style={{
          // @ts-expect-error CSS 변수 전달
          "--book-color": coverColor,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        // 호버: 표지가 살짝 들리며 3~5도 열리는 프리뷰(마우스 환경에서만 의미 있음)
        whileHover={phase === "closed" ? { y: -8, scale: 1.03 } : undefined}
        animate={
          phase === "opening"
            ? { scale: 1.35, y: -24, zIndex: 60 }
            : { scale: 1, y: 0, zIndex: 1 }
        }
        transition={phase === "opening" ? SPRING_SLOW : SPRING}
        onClick={open}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
      >
        {/* 표지가 열리면 드러나는 면지(양장본 안쪽 마블링 종이).
            표지보다 뒤에 깔려 있다가 넘어가면서 드러난다. */}
        <div className="book-endpaper" aria-hidden="true" />

        {/* 표지 — 책등을 회전축으로, 조각별 곡률을 가지고 넘어간다 */}
        <BookCover
          opening={phase === "opening"}
          title={title}
          dateLabel={dateLabel}
          photoCount={photoCount}
        />
      </motion.div>
    </div>
  );
}
