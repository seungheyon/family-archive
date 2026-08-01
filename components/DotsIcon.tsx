export function DotsIcon() {
  return (
    <span className="flex flex-col items-center gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

// PhotoSwipe 라이트박스는 앱 CSS 변수를 상속하지 않는 별도 오버레이라서(어두운 배경 위에
// 흰 아이콘을 쓰는 게 PhotoSwipe 자체 관례), currentColor에 기대지 않고 흰색을 직접 지정한다.
const DOT =
  '<span style="height:6px;width:6px;border-radius:9999px;background:#fff"></span>';

export const DOTS_ICON_HTML =
  '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' +
  '<span style="display:flex;flex-direction:column;align-items:center;gap:4px;' +
  "width:32px;height:32px;border-radius:9999px;background:rgba(255,255,255,0.18);justify-content:center\">" +
  `${DOT}${DOT}${DOT}` +
  "</span></span>";
