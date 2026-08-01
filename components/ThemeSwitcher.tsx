"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  THEME_SWITCHER_OPENED_EVENT,
  THEMES,
  type ThemeId,
} from "@/lib/theme";

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ThemeId>(DEFAULT_THEME);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme") as ThemeId | null;
    if (attr) setCurrent(attr);
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

  function selectTheme(id: ThemeId) {
    document.documentElement.setAttribute("data-theme", id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
    setCurrent(id);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative ml-auto">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          window.dispatchEvent(new CustomEvent(THEME_SWITCHER_OPENED_EVENT));
        }}
        aria-label="색상 테마 변경"
        title="색상 테마 변경"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-lg transition-colors hover:bg-surface"
      >
        🎨
      </button>
      {open && (
        <div className="card absolute right-0 top-12 z-20 flex gap-2 p-2 shadow-lg">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => selectTheme(theme.id)}
              title={theme.label}
              aria-label={theme.label}
              className="h-8 w-8 shrink-0 rounded-full border-2"
              style={{
                backgroundColor: theme.swatch,
                borderColor: current === theme.id ? "var(--foreground)" : "transparent",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
