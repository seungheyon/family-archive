"use client";

import { useEffect, useState } from "react";
import { THEME_HINT_DISMISSED_KEY, THEME_SWITCHER_OPENED_EVENT } from "@/lib/theme";

export function ThemeHintBubble() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(THEME_HINT_DISMISSED_KEY)) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    // 팔레트 버튼을 직접 눌러 색상 선택 팝오버를 열어도, 말풍선이 그 위를 가리지 않도록 즉시 닫는다.
    function onThemeSwitcherOpened() {
      dismiss();
    }
    window.addEventListener(THEME_SWITCHER_OPENED_EVENT, onThemeSwitcherOpened);
    return () => window.removeEventListener(THEME_SWITCHER_OPENED_EVENT, onThemeSwitcherOpened);
  }, [visible]);

  function dismiss() {
    localStorage.setItem(THEME_HINT_DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={dismiss}
      className="toast-bubble toast-bubble-tail-right fixed right-6 top-16 z-30 text-left"
    >
      🎨 색상 테마를 변경할 수 있어요!
    </button>
  );
}
