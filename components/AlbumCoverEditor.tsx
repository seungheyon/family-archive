"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DURATION, PAPER_EASE, SPRING } from "@/lib/motion";

/**
 * 책장에서 표지를 길게 누르면 열리는 편집 폼.
 *
 * 배경을 표지와 같은 색·질감으로 깔아서 "그 앨범의 표지에 직접 쓰는 것"처럼 보이게 한다
 * (`.cover-form`이 `.book-cover-face`와 배경을 공유한다). 실제 표지보다 조금 크게 잡아
 * 입력칸이 들어갈 자리를 만든다.
 *
 * 날짜는 기본이 달력 선택이지만, 언제였는지 날까지 기억나지 않는 경우가 흔해서 "날짜까지는
 * 모름"을 켜면 월 선택으로 바뀐다. 둘 다 비우고 저장하면 수동 지정이 풀리고 사진의
 * 촬영일자에서 자동 계산하는 원래 동작으로 돌아간다.
 */
export function AlbumCoverEditor({
  albumId,
  coverColor,
  initialTitle,
  initialStart,
  initialEnd,
  initialPrecision,
  onClose,
}: {
  albumId: string;
  coverColor: string;
  initialTitle: string;
  initialStart: string;
  initialEnd: string;
  initialPrecision: "day" | "month";
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [monthOnly, setMonthOnly] = useState(initialPrecision === "month");
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 월 선택과 날짜 선택은 값의 형태가 다르다(2025-05 / 2025-05-03). 토글할 때 지금 값을
  // 잘라내거나 채워서, 전환했다고 입력이 사라지지 않게 한다.
  function toggleMonthOnly(next: boolean) {
    setMonthOnly(next);
    if (next) {
      setStart((v) => v.slice(0, 7));
      setEnd((v) => v.slice(0, 7));
    } else {
      setStart((v) => (v.length === 7 ? `${v}-01` : v));
      setEnd((v) => (v.length === 7 ? `${v}-01` : v));
    }
  }

  async function save() {
    if (!title.trim()) {
      setError("앨범 이름을 입력해 주세요.");
      return;
    }
    if ((start && !end) || (!start && end)) {
      setError("시작과 종료를 모두 고르거나, 둘 다 비워 주세요.");
      return;
    }

    setSaving(true);
    setError("");
    const res = await fetch(`/api/albums/${albumId}/cover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        start,
        end,
        precision: monthOnly ? "month" : "day",
      }),
    });
    setSaving(false);

    if (res.ok) {
      router.refresh();
      onClose();
      return;
    }

    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setError(
      data.error === "duplicate"
        ? "같은 이름의 앨범이 이미 있어요."
        : data.error === "range-reversed"
          ? "종료가 시작보다 앞설 수 없어요."
          : "저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
    );
  }

  return (
    <div
      className="cover-form-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="앨범 표지 수정"
      onClick={onClose}
    >
      <motion.div
        className="cover-form"
        style={{ ["--book-color" as string]: coverColor }}
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
      >
        <label className="cover-form-label" htmlFor="cover-title">
          앨범 이름
        </label>
        <input
          id="cover-title"
          className="cover-form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <label className="cover-form-label" htmlFor="cover-start">
          기간
        </label>
        <div className="cover-form-row">
          <input
            id="cover-start"
            className="cover-form-input"
            type={monthOnly ? "month" : "date"}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <span className="cover-form-row-sep">~</span>
          <input
            className="cover-form-input"
            type={monthOnly ? "month" : "date"}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>

        <label className="cover-form-check">
          <input
            type="checkbox"
            checked={monthOnly}
            onChange={(e) => toggleMonthOnly(e.target.checked)}
          />
          날짜까지는 모름 (월까지만)
        </label>

        {error && <p className="cover-form-error">{error}</p>}

        <div className="mt-1 flex gap-2">
          <button
            type="button"
            className="cover-form-btn cover-form-btn-primary"
            onClick={save}
            disabled={saving}
          >
            {saving ? "저장 중…" : "저장"}
          </button>
          <button
            type="button"
            className="cover-form-btn"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </button>
        </div>

        <p className="cover-form-hint">
          기간을 둘 다 비우면 사진 촬영일자로 자동 계산해요.
        </p>
      </motion.div>
    </div>
  );
}

export const COVER_FORM_ENTER = { duration: DURATION.fast, ease: PAPER_EASE };
