"use client";

import { useEffect, useRef, useState } from "react";
import {
  SEASONS,
  SEASON_LABEL,
  SEASON_OVERRIDE_KEY,
  type Season,
} from "@/lib/season";

const SEASON_ICON: Record<Season, string> = {
  spring: "🌸",
  summer: "☀️",
  autumn: "🍁",
  winter: "❄️",
};

/**
 * 계절을 수동으로 바꿔보는 버튼.
 *
 * 기본은 날짜 자동 판정이고, 여기서 고르면 그 계절로 고정된다("자동"을 다시 고르면 해제).
 * `<html data-season>`만 갈아끼우면 배경·입자·액센트가 전부 CSS로 따라오므로 다시 렌더링할
 * 필요가 없다.
 */
export function SeasonSwitcher() {
  const [open, setOpen] = useState(false);
  const [override, setOverride] = useState<Season | null>(null);
  const [current, setCurrent] = useState<Season>("summer");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-season") as Season | null;
    if (attr) setCurrent(attr);
    const saved = localStorage.getItem(SEASON_OVERRIDE_KEY) as Season | null;
    if (saved && SEASONS.includes(saved)) setOverride(saved);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  function apply(season: Season | null) {
    if (season) {
      localStorage.setItem(SEASON_OVERRIDE_KEY, season);
      document.documentElement.setAttribute("data-season", season);
      setCurrent(season);
    } else {
      localStorage.removeItem(SEASON_OVERRIDE_KEY);
      // 자동으로 되돌릴 때는 서버가 처음 심어준 값을 다시 얻어야 하므로 새로고침한다
      window.location.reload();
      return;
    }
    setOverride(season);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="계절 테마 바꾸기"
        title="계절 테마 바꾸기"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-lg transition-colors hover:bg-surface"
      >
        {SEASON_ICON[current]}
      </button>

      {open && (
        <div className="card absolute right-0 top-12 z-50 flex flex-col gap-1 p-2 shadow-lg">
          {SEASONS.map((season) => (
            <button
              key={season}
              type="button"
              onClick={() => apply(season)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent/10 ${
                current === season ? "text-accent" : "text-foreground"
              }`}
            >
              <span>{SEASON_ICON[season]}</span>
              <span>{SEASON_LABEL[season]}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => apply(null)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent/10 ${
              override ? "text-muted" : "text-accent"
            }`}
          >
            자동 (날짜에 맞춰)
          </button>
        </div>
      )}
    </div>
  );
}
