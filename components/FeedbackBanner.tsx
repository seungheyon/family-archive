"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";

const MESSAGES: Record<string, (count?: string) => string> = {
  classified: (count) => `앨범 ${count ?? ""}개를 새로 만들었어요.`,
  "classify-empty": () =>
    "분류할 사진이 없어요 — 촬영일자(EXIF)가 있는 미분류 사진이 있어야 자동 분류가 동작해요.",
  assigned: () => "사진을 선택한 앨범으로 옮겼어요.",
  renamed: () => "앨범 이름을 저장했어요.",
  deleted: () => "사진을 삭제했어요.",
  "album-created": () => "새 앨범을 만들었어요.",
  "album-deleted": () => "앨범을 삭제했어요. 사진은 미분류로 남아있어요.",
  "album-merged": () => "앨범을 합쳤어요.",
};

/**
 * 작업 결과 안내. 예전에는 `?msg=` 쿼리파라미터가 URL에 남아있는 한 배너가 화면 위에
 * 계속 붙어 있었다 — 여기서는 토스트로 띄워 3초 뒤 사라지게 하고, URL에서도 파라미터를
 * 지워 새로고침하거나 뒤로 갔을 때 같은 안내가 다시 뜨지 않게 한다.
 *
 * 메시지를 로컬 state로 한 번 복사해두는 게 중요하다 — URL에서 msg를 지우면 서버가
 * msg 없이 다시 렌더링하므로, prop만 보고 그리면 토스트가 뜨자마자 사라져버린다.
 */
export function FeedbackBanner({
  msg,
  count,
}: {
  msg?: string;
  count?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!msg || !(msg in MESSAGES)) return;
    setToastMessage(MESSAGES[msg](count));
    // 안내를 잡아둔 뒤 주소에서 msg를 걷어낸다(history를 더럽히지 않도록 replace).
    router.replace(pathname, { scroll: false });
  }, [msg, count, pathname, router]);

  if (!toastMessage) return null;

  return (
    <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
  );
}
