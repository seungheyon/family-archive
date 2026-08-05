"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DURATION, SPRING_SLOW } from "@/lib/motion";

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
    window.setTimeout(() => router.push("/"), DURATION.slow * 1000);
  }

  return (
    <>
      <a
        href="/"
        onClick={close}
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
