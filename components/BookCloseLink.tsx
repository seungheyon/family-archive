"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SPRING_SLOW } from "@/lib/motion";

/**
 * 앨범에서 목록으로 돌아가는 링크.
 *
 * 스킬 명세상 뒤로가기는 "열림의 역순"이어야 해서, 그냥 이동시키지 않고 펼쳐진 앨범이
 * 덮이는 연출을 먼저 재생한 뒤 이동한다. 덮개는 이 컴포넌트가 화면 전체에 잠깐 씌운다.
 *
 * 브라우저 자체 뒤로가기(제스처·하드웨어 버튼)는 이 경로를 타지 않아 즉시 이동한다 —
 * 라우터가 그 시점을 가로챌 훅을 주지 않기 때문이고, 억지로 막으면 뒤로가기가 먹통이 된 것처럼
 * 느껴질 위험이 더 크다고 판단했다.
 */
export function BookCloseLink({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);

  function close(e: React.MouseEvent) {
    e.preventDefault();
    if (closing) return;
    setClosing(true);
    // 덮개 연출과 이동을 겹친다. 예전에는 연출이 끝나는 800ms 뒤에 push했는데,
    // 그동안 목록을 받아오지도 않아 대기 시간이 그대로 더해졌다(BookSpine과 동일한 문제).
    router.push("/");
  }

  return (
    <>
      <a
        href="/"
        onClick={close}
        onPointerEnter={() => router.prefetch("/")}
        onPointerDown={() => router.prefetch("/")}
        className="mb-4 inline-block text-sm text-muted hover:text-accent"
      >
        {children}
      </a>

      {closing && (
        <motion.div
          aria-hidden="true"
          className="book-closing-veil"
          initial={{ rotateY: -155, opacity: 1 }}
          animate={{ rotateY: 0 }}
          transition={SPRING_SLOW}
        />
      )}
    </>
  );
}
