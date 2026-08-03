import { useEffect, useState } from "react";

const DEFAULT_VISIBLE_MS = 3000;
const DEFAULT_FADE_MS = 300;

/**
 * 말풍선/토스트 류가 일정 시간 뒤 그라데이션으로 사라지도록 하는 공통 로직.
 * enabled가 켜지면 visibleMs 뒤 페이드를 시작하고, fadeMs 뒤 onDone을 호출한다.
 * resetKey를 바꾸면(예: 재발동) 타이머가 처음부터 다시 시작된다.
 */
export function useAutoFade({
  enabled,
  resetKey,
  visibleMs = DEFAULT_VISIBLE_MS,
  fadeMs = DEFAULT_FADE_MS,
  onDone,
}: {
  enabled: boolean;
  resetKey?: number | string;
  visibleMs?: number;
  fadeMs?: number;
  onDone: () => void;
}) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setFading(false);
    const fadeTimer = setTimeout(() => setFading(true), visibleMs);
    return () => clearTimeout(fadeTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, resetKey, visibleMs]);

  useEffect(() => {
    if (!fading) return;
    const doneTimer = setTimeout(onDone, fadeMs);
    return () => clearTimeout(doneTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fading, fadeMs]);

  return { fading, dismissNow: () => setFading(true) };
}
