"use client";

import { useEffect, useState } from "react";
import { THEME_HINT_DISMISSED_KEY } from "@/lib/theme";

export function ThemeHintBubble() {
  const [visible, setVisible] = useState(false);
  const [guiding, setGuiding] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(THEME_HINT_DISMISSED_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(THEME_HINT_DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => (guiding ? dismiss() : setGuiding(true))}
      className="toast-bubble toast-bubble-tail-right fixed right-6 top-16 z-30 text-left"
    >
      {guiding
        ? "👆 오른쪽 위 🎨 버튼을 눌러보세요! (한 번 더 누르면 닫혀요)"
        : "🎨 색상 테마를 변경할 수 있어요!"}
    </button>
  );
}
