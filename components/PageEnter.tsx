"use client";

import { motion } from "framer-motion";
import { pageEnter } from "@/lib/motion";

/**
 * 화면 단위 진입 모션.
 *
 * 앨범이 아닌 화면(로그인·미분류 등)도 같은 spring 프리셋을 타게 해서, 앱 전체가 하나의
 * 물성으로 느껴지게 한다. 큰 3D 연출은 앨범에만 쓰고 여기서는 종이가 놓이는 정도로만.
 */
export function PageEnter({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageEnter} initial="hidden" animate="visible">
      {children}
    </motion.div>
  );
}
