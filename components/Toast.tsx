"use client";

import { useEffect, useState } from "react";

const VISIBLE_MS = 3000;
const FADE_MS = 300;

export function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), VISIBLE_MS);
    return () => clearTimeout(fadeTimer);
  }, []);

  useEffect(() => {
    if (!fading) return;
    const removeTimer = setTimeout(onDismiss, FADE_MS);
    return () => clearTimeout(removeTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fading]);

  return (
    // 레이아웃을 밀어내지 않도록 fixed로 띄우고, 배경과 구분되도록 테두리를 둔다.
    <div
      role="status"
      onClick={() => setFading(true)}
      className={`toast-bubble fixed bottom-6 left-1/2 z-40 w-fit -translate-x-1/2 cursor-pointer border border-black/10 transition-opacity duration-300 dark:border-white/15 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {message}
    </div>
  );
}
