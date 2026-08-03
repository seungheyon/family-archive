"use client";

import { useEffect, useState } from "react";
import { THEME_HINT_DISMISSED_KEY, THEME_SWITCHER_OPENED_EVENT } from "@/lib/theme";
import { useAutoFade } from "@/lib/useAutoFade";

export function ThemeHintBubble() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(THEME_HINT_DISMISSED_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(THEME_HINT_DISMISSED_KEY, "1");
    setVisible(false);
  }

  const { fading, dismissNow } = useAutoFade({ enabled: visible, onDone: dismiss });

  useEffect(() => {
    if (!visible) return;
    // 팔레트 버튼을 직접 눌러 색상 선택 팝오버를 열면, 그 위를 가리지 않도록 페이드 없이 즉시 닫는다.
    function onThemeSwitcherOpened() {
      dismiss();
    }
    window.addEventListener(THEME_SWITCHER_OPENED_EVENT, onThemeSwitcherOpened);
    return () => window.removeEventListener(THEME_SWITCHER_OPENED_EVENT, onThemeSwitcherOpened);
  }, [visible]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={dismissNow}
      className={`toast-bubble toast-bubble-tail-right fixed right-6 top-16 z-30 text-left transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      🎨 색상 테마를 변경할 수 있어요!
    </button>
  );
}
