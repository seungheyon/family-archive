export function DotsIcon() {
  return (
    <span className="flex flex-col items-center gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

const DOT = '<span style="height:6px;width:6px;border-radius:9999px;background:currentColor"></span>';

export const DOTS_ICON_HTML =
  `<span style="display:flex;flex-direction:column;align-items:center;gap:4px">${DOT}${DOT}${DOT}</span>`;
