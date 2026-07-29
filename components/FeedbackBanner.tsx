const MESSAGES: Record<string, (count?: string) => string> = {
  classified: (count) => `앨범 ${count ?? ""}개를 새로 만들었어요.`,
  "classify-empty": () =>
    "분류할 사진이 없어요 — 촬영일자(EXIF) 정보가 있는 미분류 사진이 있어야 자동 분류가 동작해요.",
  assigned: () => "사진을 선택한 앨범으로 옮겼어요.",
  renamed: () => "앨범 이름을 저장했어요.",
  deleted: () => "사진을 삭제했어요.",
};

export function FeedbackBanner({
  msg,
  count,
}: {
  msg?: string;
  count?: string;
}) {
  if (!msg || !(msg in MESSAGES)) return null;
  const text = MESSAGES[msg](count);
  const isWarning = msg === "classify-empty";

  return (
    <div
      className={`mb-6 rounded-md border px-4 py-3 text-sm ${
        isWarning
          ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
          : "border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
      }`}
    >
      {text}
    </div>
  );
}
