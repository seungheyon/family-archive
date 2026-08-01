export function DotsIcon() {
  return (
    <span className="flex flex-col items-center gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

// PhotoSwipe 라이트박스 상단바는 앱 테마와 무관하게 밝은 배경으로 고정했으므로(globals.css의
// .pswp .pswp__top-bar 참고), 여기서도 currentColor에 기대지 않고 어두운 점을 직접 지정한다.
const DOT =
  '<span style="height:6px;width:6px;border-radius:9999px;background:#2b2b2b"></span>';

export const DOTS_ICON_HTML =
  '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' +
  '<span style="display:flex;flex-direction:column;align-items:center;gap:4px;' +
  "width:32px;height:32px;border-radius:9999px;background:rgba(0,0,0,0.06);justify-content:center\">" +
  `${DOT}${DOT}${DOT}` +
  "</span></span>";
