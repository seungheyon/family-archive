"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createThumbnail } from "@/lib/clientThumbnail";

/**
 * 썸네일이 없는 예전 사진들을 브라우저에서 한 번에 보정한다.
 * 남은 사진이 0장이면 아무것도 렌더링하지 않으므로, 작업이 끝나면 버튼도 사라진다.
 */
export function BackfillThumbsButton() {
  const router = useRouter();
  const [pending, setPending] = useState<string[] | null>(null);
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/thumbs")
      .then(async (r) => (r.ok ? ((await r.json()) as { ids?: string[] }) : { ids: [] }))
      .then((d) => {
        if (!cancelled) setPending(d.ids ?? []);
      })
      .catch(() => {
        if (!cancelled) setPending([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run() {
    if (!pending || pending.length === 0) return;
    setRunning(true);
    let processed = 0;
    for (const id of pending) {
      try {
        const res = await fetch(`/api/photos/${id}/file`);
        if (!res.ok) continue;
        const blob = await res.blob();
        const thumb = await createThumbnail(blob);
        if (!thumb) continue;

        const form = new FormData();
        form.set("id", id);
        form.set("thumb", thumb.blob, "thumb.jpg");
        await fetch("/api/admin/thumbs", { method: "POST", body: form });
        processed++;
        setDone(processed);
      } catch {
        // 한 장 실패해도 나머지는 계속 진행 — 다시 실행하면 남은 것만 다시 시도한다
      }
    }
    setRunning(false);
    setPending([]);
    router.refresh();
  }

  if (!pending || pending.length === 0) return null;

  return (
    <button type="button" className="btn-tinted" disabled={running} onClick={run}>
      {running
        ? `사진 최적화 중... (${done}/${pending.length})`
        : `예전 사진 ${pending.length}장 최적화하기`}
    </button>
  );
}
