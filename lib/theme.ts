export const THEME_STORAGE_KEY = "family-archive-theme";
export const THEME_HINT_DISMISSED_KEY = "family-archive-theme-hint-dismissed";
export const DEFAULT_THEME = "apricot";

export const THEMES = [
  { id: "apricot", label: "살구", swatch: "#e8935f" },
  { id: "sky", label: "하늘", swatch: "#3b82f6" },
  { id: "pink", label: "분홍", swatch: "#ec6fa0" },
  { id: "lime", label: "연두", swatch: "#5a9c2f" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
