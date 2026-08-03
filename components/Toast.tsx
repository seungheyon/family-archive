"use client";

import { useAutoFade } from "@/lib/useAutoFade";

export function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const { fading, dismissNow } = useAutoFade({ enabled: true, onDone: onDismiss });

  return (
    // 레이아웃을 밀어내지 않도록 fixed로 띄운다. 화면 최하단에 떠 있어 특정 요소를 가리키지
    // 않으므로 말풍선 화살표 없는 둥근 사각형(toast-flat)을 쓴다.
    <div
      role="status"
      onClick={dismissNow}
      className={`toast-flat fixed bottom-6 left-1/2 z-40 w-fit -translate-x-1/2 cursor-pointer border border-black/10 transition-opacity duration-300 dark:border-white/15 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {message}
    </div>
  );
}
